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
import { format } from "date-fns"
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

function BlogManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)
  const [viewingBlog, setViewingBlog] = useState<Blog | null>(null)

  const queryClient = useQueryClient()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: ["blogs", debouncedSearchTerm, selectedCategory],
    queryFn: ({ pageParam = 0 }) =>
      fetchBlogs({ pageParam, searchTerm: debouncedSearchTerm, category: selectedCategory }),
    getNextPageParam: (lastPage, pages) => (lastPage.data.length === ITEMS_PER_PAGE ? pages.length : undefined),
    initialPageParam: 0,
  })

  const createMutation = useMutation({
    mutationFn: createBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      toast.success("Blog created successfully")
      setIsCreateDialogOpen(false)
    },
    onError: () => toast.error("Failed to create blog"),
  })

  const updateMutation = useMutation({
    mutationFn: updateBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      toast.success("Blog updated successfully")
      setEditingBlog(null)
    },
    onError: () => toast.error("Failed to update blog"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      toast.success("Blog deleted successfully")
    },
    onError: () => toast.error("Failed to delete blog"),
  })

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
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
      title: initialData?.title ?? "",
      content: initialData?.content ?? "",
      category: initialData?.category ?? "NEWS",
      tags: initialData?.tags ?? [],
      publishedAt: initialData?.publishedAt ?? new Date().toISOString(),
      isActive: initialData?.isActive ?? true,
      imageBase64: "",
    })
    const [imageError, setImageError] = useState<string | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleCategoryChange = (value: string) => {
      setFormData((prev) => ({ ...prev, category: value as Blog["category"] }))
    }

    const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const tags = e.target.value.split(",").map((tag) => tag.trim())
      setFormData((prev) => ({ ...prev, tags }))
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          setImageError("Invalid file type. Please upload a PNG, JPG, or JPEG image.")
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

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit(formData)
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="title" value={formData.title} onChange={handleChange} placeholder="Title" required />
        <Textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          placeholder="Content"
          required
          className="min-h-[200px]"
        />
        <Select value={formData.category} onValueChange={handleCategoryChange}>
          <SelectTrigger>
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
        <Input
          name="tags"
          value={formData.tags.join(", ")}
          onChange={handleTagChange}
          placeholder="Tags (comma-separated)"
        />
        <Input
          name="publishedAt"
          type="datetime-local"
          value={formData.publishedAt.slice(0, 16)}
          onChange={handleChange}
        />
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked as boolean }))}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
        <Input type="file" onChange={handleImageChange} accept={ALLOWED_IMAGE_TYPES.join(",")} />
        {imageError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{imageError}</AlertDescription>
          </Alert>
        )}
        <Button type="submit">Submit</Button>
      </form>
    )
  }

  const BlogCard = ({ blog }: { blog: Blog }) => {
    const truncatedContent = useMemo(() => {
      const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "")
      return stripHtml(blog.content).slice(0, 100) + "..."
    }, [blog.content])

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden transition-shadow duration-300 hover:shadow-lg">
          <CardHeader className="relative p-0">
            <img src={blog.Image || "/placeholder.svg"} alt={blog.title} className="w-full h-48 object-cover" />
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              {blog.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <CardTitle className="text-xl font-bold mb-2">{blog.title}</CardTitle>
            <p className="mb-2 text-sm text-gray-600">{truncatedContent}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs flex items-center"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center">
                <Filter className="h-3 w-3 mr-1" /> {blog.category}
              </p>
              <p className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {blog.publishedAt && !isNaN(new Date(blog.publishedAt).getTime())
                  ? format(new Date(blog.publishedAt), "PPP")
                  : "Invalid date"}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between space-x-2 p-4 bg-gray-50">
            <Button variant="outline" size="sm" onClick={() => setViewingBlog(blog)}>
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
            <div>
              <Button variant="outline" size="sm" onClick={() => setEditingBlog(blog)} className="mr-2">
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteBlog(blog._id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    )
  }

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg flex items-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8 flex items-center">
        <Plus className="h-8 w-8 mr-2" /> Blog Management
      </h1>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search blogs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
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
        </div>
        <div className="flex space-x-2 w-full md:w-auto">
          <Button onClick={() => refetch()} className="flex-grow md:flex-grow-0">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-grow md:flex-grow-0">
                <Plus className="h-4 w-4 mr-2" /> Create Blog
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Blog</DialogTitle>
                <DialogDescription>Fill in the details for the new blog post.</DialogDescription>
              </DialogHeader>
              <BlogForm onSubmit={handleCreateBlog} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <LoadingOverlay />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load blogs. Please try again later.</AlertDescription>
        </Alert>
      ) : (
        <>
          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.pages.map((page, i) => (
                <React.Fragment key={i}>
                  {page.data.map((blog: Blog) => (
                    <BlogCard key={blog._id} blog={blog} />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </AnimatePresence>
          {hasNextPage && (
            <div className="mt-8 text-center">
              <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!editingBlog} onOpenChange={(open) => !open && setEditingBlog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Blog</DialogTitle>
            <DialogDescription>Update the details of the blog post.</DialogDescription>
          </DialogHeader>
          {editingBlog && <BlogForm initialData={editingBlog} onSubmit={handleUpdateBlog} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingBlog} onOpenChange={(open) => !open && setViewingBlog(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{viewingBlog?.title}</DialogTitle>
            <DialogDescription>
              Published on{" "}
              {viewingBlog?.publishedAt && !isNaN(new Date(viewingBlog.publishedAt).getTime())
                ? format(new Date(viewingBlog.publishedAt), "PPP")
                : "Invalid date"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <img
              src={viewingBlog?.Image || "/placeholder.svg"}
              alt={viewingBlog?.title}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: viewingBlog?.content || "" }} />
            <div className="mt-4 flex flex-wrap gap-2">
              {viewingBlog?.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs flex items-center"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}

function BlogManagementWrapper() {
  const [queryClient] = React.useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <BlogManagement />
    </QueryClientProvider>
  )
}

export default BlogManagementWrapper

