"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { 
  Search, Calendar, Clock, User, Tag, Video, ImageIcon, 
  Play, Loader2, Maximize2, FileText, AlertTriangle, 
  ChevronDown, Filter, Eye, BookOpen
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavBar } from "@/components/NavBar"
import { Pagination } from "@/components/Pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { motion } from "framer-motion"
import { Separator } from "@/components/ui/separator"

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
  author?: string
  readTime?: number
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
  blog: Blog; 
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
        <div className={`relative ${heightClass} w-full bg-purple-950`}>
          <iframe 
            src={embedUrl} 
            className="w-full h-full pointer-events-none" 
            title={blog.title} 
            frameBorder="0" 
          />
          <div className="absolute inset-0 bg-transparent" /> {/* Overlay to prevent interaction in preview */}
          <div className="absolute bottom-2 left-2 bg-purple-900/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
            <Video className="h-3 w-3" /> Video
          </div>
        </div>
      )
    }
    return (
      <div className={`relative ${heightClass} w-full group bg-purple-950`}>
        <video src={videoSource} className={`w-full h-full object-${objectFit}`} muted playsInline preload="metadata" />
        <div className="absolute inset-0 bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-900/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 bg-purple-900/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
          <Video className="h-3 w-3" /> Video
        </div>
      </div>
    )
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
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )
  }
  
  return (
    <div className={`relative ${heightClass} w-full bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-800/20 flex items-center justify-center`}>
      <div className="text-purple-300 text-center">
        <FileText className="h-12 w-12 mx-auto mb-2" />
        <p className="text-xs text-purple-400">No media</p>
      </div>
    </div>
  )
}

export default function BlogLayout() {
  const router = useRouter()
  const [posts, setPosts] = React.useState<Blog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [sortBy, setSortBy] = React.useState<"date" | "popularity">("date")

  React.useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch("/api/blog?includeUploads=true&isActive=true&sort=publishedAt:desc&limit=100")
        if (!response.ok) {
          throw new Error("Failed to fetch posts")
        }
        const data = await response.json()
        if (data.success) {
          // Filter to only show completed or non-upload blogs that are active
          const filteredPosts = data.data.filter((post: Blog) => 
            post.isActive &&
            (!post.uploadStatus || 
            post.uploadStatus === "completed")
          )
          setPosts(filteredPosts)
        } else {
          throw new Error("Failed to fetch posts")
        }
      } catch (err) {
        setError("Failed to load posts. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const filteredPosts = React.useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || post.category === selectedCategory
      const matchesTag = !selectedTag || post.tags.includes(selectedTag)

      return matchesSearch && matchesCategory && matchesTag
    })
  }, [posts, searchQuery, selectedCategory, selectedTag])

  const sortedPosts = React.useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      } else {
        // Assuming popularity is based on readTime (you might want to use a different metric)
        return (b.views || 0) - (a.views || 0)
      }
    })
  }, [filteredPosts, sortBy])

  const paginatedPosts = React.useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    return sortedPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  }, [sortedPosts, currentPage])

  const recentPosts = React.useMemo(() => {
    return [...posts].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 3)
  }, [posts])

  const categories = React.useMemo(() => {
    const categoryCount = posts.reduce(
      (acc, post) => {
        acc[post.category] = (acc[post.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(categoryCount).map(([name, count]) => ({ name, count }))
  }, [posts])

  const allTags = React.useMemo(() => {
    return Array.from(new Set(posts.flatMap((post) => post.tags || [])))
  }, [posts])

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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleRedirectToPost = (postId: string) => {
    router.push(`/blogs/${postId}`)
  }

  if (loading) {
    return <BlogSkeleton />
  }

  if (error) {
    return <ErrorMessage message={error} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50/30">
      <NavBar />
      <div className="container px-4 py-8 mx-auto">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <main className="space-y-8">
            {/* Header with Purple-900 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                  Our Blog
                </h1>
                <p className="text-gray-600 mt-2">
                  Discover stories, recipes, and insights from Manyazewal
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50 rounded-xl"
                  >
                    <Filter className="mr-2 h-4 w-4 text-purple-900" />
                    Sort by: {sortBy === "date" ? "Date" : "Popularity"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl border-purple-200">
                  <DropdownMenuItem 
                    onClick={() => setSortBy("date")}
                    className="hover:bg-purple-50 hover:text-purple-900"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Date
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy("popularity")}
                    className="hover:bg-purple-50 hover:text-purple-900"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Popularity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Active Filters */}
            <ActiveFilters
              selectedCategory={selectedCategory}
              selectedTag={selectedTag}
              setSelectedCategory={setSelectedCategory}
              setSelectedTag={setSelectedTag}
            />

            {/* Blog Posts */}
            {paginatedPosts.length === 0 ? (
              <NoPostsFound />
            ) : (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  {paginatedPosts.map((post, index) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <BlogPostCard post={post} onRedirect={handleRedirectToPost} />
                    </motion.div>
                  ))}
                </motion.div>

                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredPosts.length}
                  pageSize={POSTS_PER_PAGE}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </main>

          {/* Sidebar with Purple-900 */}
          <aside className="space-y-8">
            <SearchCard searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <CategoriesCard
              categories={categories}
              selectedCategory={selectedCategory}
              handleCategoryClick={handleCategoryClick}
            />
            <RecentPostsCard recentPosts={recentPosts} />
            <TagsCard allTags={allTags} selectedTag={selectedTag} handleTagClick={handleTagClick} />
            <NewsletterCard />
            <AdvertisementCard />
          </aside>
        </div>
      </div>
    </div>
  )
}

const BlogPostCard: React.FC<{ post: Blog; onRedirect: (id: string) => void }> = ({ post, onRedirect }) => (
  <article className="group overflow-hidden rounded-2xl border-2 border-purple-100 bg-white hover:shadow-xl transition-all duration-300 hover:border-purple-300">
    <div 
      className="aspect-video overflow-hidden cursor-pointer relative"
      onClick={() => onRedirect(post._id)}
    >
      <BlogMediaPreview blog={post} heightClass="h-full" />
    </div>
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge className="bg-purple-100 text-purple-900 hover:bg-purple-200 border-0 rounded-full px-3 py-1">
          {post.category}
        </Badge>
        <span className="flex items-center gap-1 text-gray-600">
          <Calendar className="w-4 h-4 text-purple-700" />
          {new Date(post.publishedAt).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1 text-gray-600">
          <Clock className="w-4 h-4 text-purple-700" />
          {post.readTime || 5} min read
        </span>
      </div>
      
      <h2 
        className="text-2xl font-bold text-gray-800 group-hover:text-purple-900 transition-colors cursor-pointer"
        onClick={() => onRedirect(post._id)}
      >
        {post.title}
      </h2>
      
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="p-1.5 bg-purple-100 rounded-full">
          <User className="w-3 h-3 text-purple-900" />
        </div>
        <span className="font-medium">{post.author || "Admin"}</span>
      </div>
      
      <div 
        className="text-gray-600 line-clamp-3 prose prose-purple"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div className="flex flex-wrap gap-2">
          {post.tags && post.tags.slice(0, 3).map((tag) => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-full"
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))}
          {post.tags && post.tags.length > 3 && (
            <Badge variant="outline" className="border-purple-200 text-purple-700 rounded-full">
              +{post.tags.length - 3}
            </Badge>
          )}
        </div>
        
        <Button 
          onClick={() => onRedirect(post._id)}
          className="rounded-full bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 shadow-md hover:shadow-lg px-6"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Read More
        </Button>
      </div>
    </div>
  </article>
)

const ActiveFilters: React.FC<{
  selectedCategory: string | null
  selectedTag: string | null
  setSelectedCategory: (category: string | null) => void
  setSelectedTag: (tag: string | null) => void
}> = ({ selectedCategory, selectedTag, setSelectedCategory, setSelectedTag }) => {
  if (!selectedCategory && !selectedTag) return null
  
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
      <span className="text-sm text-purple-900 font-medium">Active filters:</span>
      {selectedCategory && (
        <Badge 
          variant="secondary" 
          className="cursor-pointer bg-purple-100 text-purple-900 hover:bg-purple-200 rounded-full px-3 py-1"
          onClick={() => setSelectedCategory(null)}
        >
          Category: {selectedCategory} ×
        </Badge>
      )}
      {selectedTag && (
        <Badge 
          variant="secondary" 
          className="cursor-pointer bg-purple-100 text-purple-900 hover:bg-purple-200 rounded-full px-3 py-1"
          onClick={() => setSelectedTag(null)}
        >
          Tag: {selectedTag} ×
        </Badge>
      )}
    </div>
  )
}

const NoPostsFound: React.FC = () => (
  <div className="text-center py-16 bg-white rounded-2xl border-2 border-purple-100">
    <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
      <FileText className="h-10 w-10 text-purple-900" />
    </div>
    <h2 className="text-2xl font-bold text-purple-900 mb-2">No posts found</h2>
    <p className="text-gray-600">Try adjusting your search or filters</p>
  </div>
)

const SearchCard: React.FC<{ searchQuery: string; setSearchQuery: (query: string) => void }> = ({
  searchQuery,
  setSearchQuery,
}) => (
  <Card className="border-2 border-purple-100 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
    <CardHeader className="pb-3">
      <CardTitle className="text-purple-900 flex items-center gap-2">
        <Search className="h-5 w-5" />
        Search
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-purple-700" />
        <Input
          placeholder="Search posts..."
          className="pl-10 border-2 border-purple-100 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </CardContent>
  </Card>
)

const CategoriesCard: React.FC<{
  categories: { name: string; count: number }[]
  selectedCategory: string | null
  handleCategoryClick: (category: string) => void
}> = ({ categories, selectedCategory, handleCategoryClick }) => (
  <Card className="border-2 border-purple-100 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
    <CardHeader className="pb-3">
      <CardTitle className="text-purple-900 flex items-center gap-2">
        <Tag className="h-5 w-5" />
        Categories
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-2">
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={selectedCategory === category.name ? "secondary" : "ghost"}
              className={`w-full justify-between font-normal rounded-xl ${
                selectedCategory === category.name 
                  ? 'bg-purple-100 text-purple-900 hover:bg-purple-200' 
                  : 'hover:bg-purple-50 hover:text-purple-900'
              }`}
              onClick={() => handleCategoryClick(category.name)}
            >
              {category.name}
              <Badge variant="outline" className="ml-2 border-purple-200 text-purple-700">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
)

const RecentPostsCard: React.FC<{ recentPosts: Blog[] }> = ({ recentPosts }) => (
  <Card className="border-2 border-purple-100 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
    <CardHeader className="pb-3">
      <CardTitle className="text-purple-900 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Recent Posts
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {recentPosts.map((post) => (
          <div key={post._id} className="flex gap-4 group">
            <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 border-purple-100 group-hover:border-purple-300 transition-colors">
              <BlogMediaPreview blog={post} heightClass="h-full" />
            </div>
            <div className="space-y-1 flex-1">
              <Badge variant="outline" className="border-purple-200 text-purple-700 text-xs px-2 py-0">
                {post.category}
              </Badge>
              <Link 
                href={`/blog/${post._id}`} 
                className="line-clamp-2 text-sm font-medium text-gray-700 hover:text-purple-900 transition-colors"
              >
                {post.title}
              </Link>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-700" />
                {new Date(post.publishedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const TagsCard: React.FC<{
  allTags: string[]
  selectedTag: string | null
  handleTagClick: (tag: string) => void
}> = ({ allTags, selectedTag, handleTagClick }) => (
  <Card className="border-2 border-purple-100 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
    <CardHeader className="pb-3">
      <CardTitle className="text-purple-900 flex items-center gap-2">
        <Tag className="h-5 w-5" />
        Tags
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
          <Badge
            key={tag}
            variant={selectedTag === tag ? "default" : "secondary"}
            className={`cursor-pointer transition-all rounded-full px-3 py-1 ${
              selectedTag === tag 
                ? 'bg-purple-900 text-white hover:bg-purple-800' 
                : 'bg-purple-100 text-purple-900 hover:bg-purple-200'
            }`}
            onClick={() => handleTagClick(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </CardContent>
  </Card>
)

const NewsletterCard: React.FC = () => (
  <Card className="border-2 border-purple-100 rounded-2xl shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-white">
    <CardHeader className="pb-3">
      <CardTitle className="text-purple-900 flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Subscribe to Newsletter
      </CardTitle>
    </CardHeader>
    <CardContent>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
        <Input 
          placeholder="Enter your email" 
          type="email" 
          className="border-2 border-purple-200 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl"
        />
        <Button 
          className="w-full bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 rounded-xl"
        >
          Subscribe
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Get the latest posts delivered to your inbox
        </p>
      </form>
    </CardContent>
  </Card>
)

const AdvertisementCard: React.FC = () => (
  <Card className="border-2 border-dashed border-purple-200 rounded-2xl bg-gradient-to-br from-purple-50/50 to-white">
    <CardContent className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
          <Maximize2 className="h-8 w-8 text-purple-900" />
        </div>
        <p className="text-sm font-medium text-purple-900">Advertisement Space</p>
        <p className="text-xs text-gray-500 mt-1">Reach our audience</p>
      </div>
    </CardContent>
  </Card>
)

const BlogSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-white to-purple-50/30">
    <div className="container px-4 py-8 mx-auto">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <main className="space-y-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
            </div>
          ))}
        </main>
        <aside className="space-y-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </aside>
      </div>
    </div>
  </div>
)

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-purple-50/30">
    <Card className="w-full max-w-md border-2 border-red-200 rounded-2xl">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <CardTitle className="text-center text-red-600">Error</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-6">{message}</p>
        <Button 
          className="w-full bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 rounded-xl"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  </div>
)
