"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Calendar, Clock, User, Tag, Share2, ChevronLeft, Bookmark, BookmarkCheck } from "lucide-react"

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
  Image: string
  author?: {
    name: string
    avatar: string
  }
  readTime?: number
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
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
    const fetchPostAndRelated = async () => {
      try {
        const [postResponse, relatedResponse] = await Promise.all([
          fetch(`/api/blog/${id}`),
          fetch("/api/blog"),
        ])

        if (!postResponse.ok || !relatedResponse.ok) throw new Error("Failed to fetch data")

        const postData = await postResponse.json()
        const relatedData = await relatedResponse.json()

        setPost({
          ...postData.data,
          author: {
            name: "Manyazewal Eshetu Gibi",
            avatar: "/man_logo.png",
          },
          readTime: 5,
        })

        const filtered = relatedData.data
          .filter((p: BlogPost) => p._id !== id && p.category === postData.data.category)
          .sort((a: BlogPost, b: BlogPost) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, 3)

        setRelatedPosts(filtered)
      } catch (err) {
        setError("Failed to load blog post. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPostAndRelated()
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
          <div className="relative">
            <Image
              src={post.Image || "/placeholder.svg"}
              alt={post.title}
              width={1200}
              height={600}
              className="rounded-lg object-cover w-full aspect-video mb-8"
            />
    
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
            {post.tags.map((tag) => (
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
    <div className="relative">
      <Image
        src={post.Image || "/placeholder.svg"}
        alt={post.title}
        width={600}
        height={300}
        className="object-cover w-full h-48 transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <Badge className="absolute top-2 left-2">{post.category}</Badge>
    </div>
    <CardContent className="p-6 relative z-10 -mt-10 bg-gradient-to-t from-background via-background to-transparent">
      <h3 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        <Link href={`/blog/${post._id}`}>{post.title}</Link>
      </h3>
      <p className="text-muted-foreground mb-4 line-clamp-2">{post.content.replace(/<[^>]+>/g, "")}</p>
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

