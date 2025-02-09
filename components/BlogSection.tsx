"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ChevronRight } from "lucide-react"

import type { ReactNode } from "react"

interface BlogPost {
  _id: string
  title: string
  content: string
  category: string
  tags: string[]
  publishedAt: string
  Image: string
}

const BrutalButton = ({ children, className = "", ...props }: { children: ReactNode; className?: string }) => (
  <button
    className={`px-8 py-2 border-2 border-black dark:border-white uppercase bg-white dark:bg-black text-black dark:text-white transition duration-200 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none ${className}`}
    {...props}
  >
    {children}
  </button>
)

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

export function BlogSection() {
  const [isLoading, setIsLoading] = useState(true)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const response = await fetch("/api/blog")
        const data = await response.json()
        if (data.success) {
          setBlogPosts(data.data.slice(0, 3)) // Get the latest 3 blog posts
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlogPosts()
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800"
    >
      <div className="container px-4 mx-auto sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl font-extrabold text-gray-900 dark:text-white sm:text-6xl lg:text-7xl"
          >
            Latest from Our Blog
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-4 text-xl text-gray-600 dark:text-gray-300"
          >
            Discover stories, recipes, and insights from Ethiopian cuisine
          </motion.p>
        </div>
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
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
              : blogPosts.map((post, index) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2"
                  >
                    <div className="relative h-64">
                      <Image src={post.Image || "/placeholder.svg"} alt={post.title} layout="fill" objectFit="cover" />
                      <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {post.category}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">{post.title}</h3>
                      {/* <p className="text-gray-600 dark:text-gray-300 mb-4">{post.content.substring(0, 100)}...</p> */}
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="px-6 py-4">
                      <Link href={`/blogs/${post._id}`} passHref>
                        <BrutalButton className="w-full flex items-center justify-center">
                          Read More <ChevronRight className="ml-2 h-4 w-4" />
                        </BrutalButton>
                      </Link>
                    </div>
                  </motion.div>
                ))}
          </AnimatePresence>
        </div>
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <Link href="/blog" passHref>
            <BrutalButton>View All Posts</BrutalButton>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}

