"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, Calendar, Clock, User, Tag } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavBar } from "@/components/NavBar"
import { Pagination } from "@/components/Pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Post {
  _id: string
  title: string
  content: string
  category: string
  tags: string[]
  publishedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  Image: string
  author: string
  readTime: number
}

const POSTS_PER_PAGE = 5

export default function BlogLayout() {
  const router = useRouter()
  const [posts, setPosts] = React.useState<Post[]>([])
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
        const response = await fetch("/api/blog")
        if (!response.ok) {
          throw new Error("Failed to fetch posts")
        }
        const data = await response.json()
        if (data.success) {
          setPosts(data.data)
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
        return b.readTime - a.readTime
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
    return Array.from(new Set(posts.flatMap((post) => post.tags)))
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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <NavBar />
      <div className="container px-4 py-8 mx-auto">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <main className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Sort by: {sortBy === "date" ? "Date" : "Popularity"}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("date")}>Date</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("popularity")}>Popularity</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ActiveFilters
              selectedCategory={selectedCategory}
              selectedTag={selectedTag}
              setSelectedCategory={setSelectedCategory}
              setSelectedTag={setSelectedTag}
            />
            {paginatedPosts.length === 0 ? (
              <NoPostsFound />
            ) : (
              <>
                {paginatedPosts.map((post) => (
                  <BlogPostCard key={post._id} post={post} onRedirect={handleRedirectToPost} />
                ))}
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredPosts.length}
                  pageSize={POSTS_PER_PAGE}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </main>

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

const BlogPostCard: React.FC<{ post: Post; onRedirect: (id: string) => void }> = ({ post, onRedirect }) => (
  <article className="group overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
    <div className="aspect-video overflow-hidden">
      <Image
        src={post.Image || "/placeholder.svg"}
        alt={post.title}
        width={800}
        height={400}
        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
      />
    </div>
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge>{post.category}</Badge>
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {new Date(post.publishedAt).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {post.readTime} min read
        </span>
      </div>
      <h2 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">{post.title}</h2>
      <div className="flex items-center gap-2 text-sm">
        <User className="w-4 h-4" />
        <span>{post.author}</span>
      </div>
      <div className="text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: post.content }} />
      <div className="flex items-center justify-between pt-4">
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {tag}
            </Badge>
          ))}
        </div>
        <Button onClick={() => onRedirect(post._id)}>Read More</Button>
      </div>
    </div>
  </article>
)

const ActiveFilters: React.FC<{
  selectedCategory: string | null
  selectedTag: string | null
  setSelectedCategory: (category: string | null) => void
  setSelectedTag: (tag: string | null) => void
}> = ({ selectedCategory, selectedTag, setSelectedCategory, setSelectedTag }) => (
  <div className="flex flex-wrap items-center gap-2">
    {selectedCategory && (
      <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategory(null)}>
        Category: {selectedCategory} ×
      </Badge>
    )}
    {selectedTag && (
      <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedTag(null)}>
        Tag: {selectedTag} ×
      </Badge>
    )}
  </div>
)

const NoPostsFound: React.FC = () => (
  <div className="text-center py-12">
    <h2 className="text-xl font-semibold">No posts found</h2>
    <p className="text-muted-foreground mt-2">Try adjusting your search or filters</p>
  </div>
)

const SearchCard: React.FC<{ searchQuery: string; setSearchQuery: (query: string) => void }> = ({
  searchQuery,
  setSearchQuery,
}) => (
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
)

const CategoriesCard: React.FC<{
  categories: { name: string; count: number }[]
  selectedCategory: string | null
  handleCategoryClick: (category: string) => void
}> = ({ categories, selectedCategory, handleCategoryClick }) => (
  <Card>
    <CardHeader>
      <CardTitle>Categories</CardTitle>
    </CardHeader>
    <CardContent>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-2">
          {categories.map((category) => (
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
)

const RecentPostsCard: React.FC<{ recentPosts: Post[] }> = ({ recentPosts }) => (
  <Card>
    <CardHeader>
      <CardTitle>Recent Posts</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {recentPosts.map((post) => (
          <div key={post._id} className="flex gap-4">
            <Image
              src={post.Image || "/placeholder.svg"}
              alt={post.title}
              width={80}
              height={80}
              className="rounded-lg object-cover w-20 h-20"
            />
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">{post.category}</div>
              <Link href={`/blog/${post._id}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
                {post.title}
              </Link>
              <div className="text-xs text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString()}</div>
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
  <Card>
    <CardHeader>
      <CardTitle>Tags</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
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
)

const NewsletterCard: React.FC = () => (
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
)

const AdvertisementCard: React.FC = () => (
  <Card className="border-2 border-dashed">
    <CardContent className="flex items-center justify-center p-6">
      <div className="text-center">
        <p className="mt-2 text-sm text-muted-foreground">Advertisement Space</p>
      </div>
    </CardContent>
  </Card>
)

const BlogSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
    <div className="container px-4 py-8 mx-auto">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <main className="space-y-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </main>
        <aside className="space-y-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </aside>
      </div>
    </div>
  </div>
)

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-secondary/10">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-red-500">Error</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center">{message}</p>
        <Button className="w-full mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  </div>
)

