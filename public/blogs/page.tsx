"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Command, Search, ChevronLeft, ChevronRight } from 'lucide-react'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavBar } from "@/components/NavBar"
import { Pagination } from "@/components/Pagination"
import { posts, categories, allTags } from "@/data/posts"
import type { Post } from "@/types/blog"

const POSTS_PER_PAGE = 5

export default function BlogLayout() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)

  // Filter posts based on search, category, and tag
  const filteredPosts = React.useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || post.category === selectedCategory
      const matchesTag = !selectedTag || post.tags.includes(selectedTag)
      
      return matchesSearch && matchesCategory && matchesTag
    })
  }, [searchQuery, selectedCategory, selectedTag])

  // Paginate posts
  const paginatedPosts = React.useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  }, [filteredPosts, currentPage])

  // Get recent posts (last 3)
  const recentPosts = React.useMemo(() => {
    return [...posts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
  }, [])

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
    setSelectedTag(null) // Reset tag when changing category
    setCurrentPage(1) // Reset to first page
  }

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag)
    setSelectedCategory(null) // Reset category when changing tag
    setCurrentPage(1) // Reset to first page
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
            {paginatedPosts.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold">No posts found</h2>
                <p className="text-muted-foreground mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                {paginatedPosts.map((post) => (
                  <article key={post.id} className="group">
                    <Link href="#" className="space-y-4 block">
                      <div className="overflow-hidden rounded-lg">
                        <Image
                          src={post.image}
                          alt={post.title}
                          width={800}
                          height={400}
                          className="rounded-lg object-cover w-full aspect-video transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>{post.category}</Badge>
                          {post.tags.map((tag) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                          {post.title}
                        </h2>
                        <div className="text-sm text-muted-foreground">{post.date}</div>
                        <p className="text-muted-foreground leading-relaxed">{post.excerpt}</p>
                      </div>
                    </Link>
                  </article>
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

            {/* Recent Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="flex gap-4">
                      <Image
                        src={post.image}
                        alt={post.title}
                        width={80}
                        height={80}
                        className="rounded-lg object-cover w-20 h-20"
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">{post.category}</div>
                        <Link href="#" className="line-clamp-2 text-sm font-medium hover:text-primary">
                          {post.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">{post.date}</div>
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
    </div>
  )
}

