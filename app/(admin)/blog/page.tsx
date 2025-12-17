"use client"

import React, { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
  EyeOff,
  Loader2,
  RefreshCw,
  Filter,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Blog = {
  _id: string
  title: string
  content: string
  category: "NEWS" | "EVENTS" | "COURSE" | "PROMOTION" | "OTHER"
  tags: string[]
  publishedAt: string
  isActive: boolean
  Image: string
}

type BlogFormData = Omit<Blog, "_id" | "Image"> & { imageBase64: string }

const ITEMS_PER_PAGE = 9
const CATEGORIES = ["NEWS", "EVENTS", "COURSE", "PROMOTION", "OTHER"] as const
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"]

const fetchBlogs = async ({ pageParam = 0, searchTerm = "", category = "" }) => {
  const response = await fetch(`/api/blog?page=${pageParam}&search=${searchTerm}&category=${category}`)
  if (!response.ok) throw new Error("Network response was not ok")
  return response.json()
}

const createBlog = async (data: BlogFormData) => {
  const response = await fetch("/api/blog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to create blog")
  return response.json()
}

const updateBlog = async ({ id, data }: { id: string; data: BlogFormData }) => {
  const response = await fetch(`/api/blog/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to update blog")
  return response.json()
}

const deleteBlog = async (id: string) => {
  const response = await fetch(`/api/blog/${id}`, { method: "DELETE" })
  if (!response.ok) throw new Error("Failed to delete blog")
  return response.json()
}

// Safe HTML stripping function
const stripHtml = (html?: string): string => {
  if (!html || typeof html !== "string") return ""
  return html.replace(/<[^>]*>/g, "")
}

// Safe truncation function
const truncateText = (text?: string, maxLength: number = 100): string => {
  const plainText = stripHtml(text || "")
  if (plainText.length <= maxLength) return plainText
  return plainText.substring(0, maxLength) + "..."
}

// Safe date formatting
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

function BlogManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)
  const [viewingBlog, setViewingBlog] = useState<Blog | null>(null)

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
  })

  const createMutation = useMutation({
    mutationFn: createBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      toast.success("Blog created successfully")
      setIsCreateDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create blog")
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

  const handleCreateBlog = (data: BlogFormData) => {
    createMutation.mutate(data)
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

  const BlogForm = ({ initialData, onSubmit }: { initialData?: Blog; onSubmit: (data: BlogFormData) => void }) => {
    const [formData, setFormData] = useState<BlogFormData>({
      title: initialData?.title || "",
      content: initialData?.content || "",
      category: initialData?.category || "NEWS",
      tags: initialData?.tags || [],
      publishedAt: initialData?.publishedAt || new Date().toISOString(),
      isActive: initialData?.isActive ?? true,
      imageBase64: "",
    })
    const [imageError, setImageError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          setImageError("Invalid file type. Please upload a PNG, JPG, or JPEG image.")
          return
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          setImageError("File size too large. Maximum size is 5MB.")
          return
        }
        setImageError(null)
        const reader = new FileReader()
        reader.onloadend = () => {
          setFormData((prev) => ({ ...prev, imageBase64: reader.result as string }))
        }
        reader.readAsDataURL(file)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)
      try {
        await onSubmit(formData)
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input 
            id="title" 
            name="title" 
            value={formData.title} 
            onChange={handleChange} 
            placeholder="Enter blog title" 
            required 
            disabled={isSubmitting}
          />
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
            className="min-h-[200px]"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={handleCategoryChange} disabled={isSubmitting}>
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked as boolean }))}
            disabled={isSubmitting}
          />
          <Label htmlFor="isActive" className="cursor-pointer">Published & Active</Label>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="image">Featured Image</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="image"
              type="file"
              onChange={handleImageChange}
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              disabled={isSubmitting}
              className="flex-1"
            />
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          {formData.imageBase64 && (
            <div className="mt-2">
              <p className="text-xs text-green-600 mb-1">✓ Image selected</p>
              <div className="w-32 h-32 border rounded overflow-hidden">
                <img 
                  src={formData.imageBase64} 
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
          <p className="text-xs text-muted-foreground">
            Allowed formats: PNG, JPG, JPEG. Max size: 5MB
          </p>
        </div>
        
        <Button 
          type="submit" 
          disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
          className="w-full"
        >
          {(isSubmitting || createMutation.isPending || updateMutation.isPending) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {initialData ? "Updating..." : "Creating..."}
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
      return truncateText(blog.content, 100)
    }, [blog.content])

    const safeDate = useMemo(() => {
      return formatDateSafe(blog.publishedAt)
    }, [blog.publishedAt])

    const safeImageUrl = blog.Image || "/placeholder.svg"

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden transition-shadow duration-300 hover:shadow-lg h-full flex flex-col">
          <CardHeader className="relative p-0">
            <div className="relative h-48 w-full overflow-hidden">
              <img 
                src={safeImageUrl} 
                alt={blog.title || "Blog image"} 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg"
                }}
              />
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center">
                {blog.isActive ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" /> Published
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" /> Draft
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-grow">
            <CardTitle className="text-xl font-bold mb-2 line-clamp-2">
              {blog.title || "Untitled Blog"}
            </CardTitle>
            <p className="mb-3 text-sm text-gray-600 line-clamp-3">
              {truncatedContent}
            </p>
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
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
            <div className="text-xs text-muted-foreground space-y-1 mt-auto">
              <p className="flex items-center">
                <Filter className="h-3 w-3 mr-1" /> {blog.category || "Uncategorized"}
              </p>
              <p className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {safeDate}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between space-x-2 p-4 bg-gray-50/50 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setViewingBlog(blog)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
            <div className="flex space-x-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditingBlog(blog)}
                disabled={deleteMutation.isPending}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => handleDeleteBlog(blog._id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Blog Post</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new blog post. All fields marked with * are required.
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Update the details of your blog post. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          {editingBlog && <BlogForm initialData={editingBlog} onSubmit={handleUpdateBlog} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingBlog} onOpenChange={(open) => !open && setViewingBlog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{viewingBlog?.title || "Blog Post"}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Published on {formatDateSafe(viewingBlog?.publishedAt)}
              <span className="mx-2">•</span>
              <Filter className="h-4 w-4" />
              {viewingBlog?.category || "Uncategorized"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            {viewingBlog?.Image && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={viewingBlog.Image}
                  alt={viewingBlog?.title || "Blog image"}
                  className="w-full h-auto max-h-[400px] object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              </div>
            )}
            
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: viewingBlog?.content || "" }} />
            </div>
            
            {viewingBlog?.tags && viewingBlog.tags.length > 0 && (
              <div className="pt-6 border-t">
                <h4 className="text-sm font-medium mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingBlog.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${viewingBlog?.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {viewingBlog?.isActive ? (
                    <>
                      <Eye className="h-3 w-3 inline mr-1" /> Published
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3 inline mr-1" /> Draft
                    </>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={() => viewingBlog && setEditingBlog(viewingBlog)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Post
              </Button>
            </div>
          </div>
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