"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { toast, Toaster } from "react-hot-toast"
import { format, parseISO, isAfter, isBefore, isEqual } from "date-fns"
import {
  Facebook,
  Instagram,
  Send,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Plus,
  XIcon,
  Calendar,
  Filter,
  Image,
  Video,
  Type,
  BarChart2,
  PieChart,
  Sliders,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type Content = {
  _id: string
  platformName: string
  content: string
  postType: string
  scheduleTime: string
  status: string
  retryCount: number
  contentValidation: boolean
}

type PlatformInfo = {
  name: string
  icon: React.ReactNode
  color: string
}

type PostTypeInfo = {
  name: string
  icon: React.ReactNode
}

const platforms: PlatformInfo[] = [
  { name: "X", icon: <XIcon className="h-6 w-6" />, color: "bg-black" },
  { name: "Facebook", icon: <Facebook className="h-6 w-6" />, color: "bg-blue-600" },
  { name: "Instagram", icon: <Instagram className="h-6 w-6" />, color: "bg-pink-500" },
  { name: "Telegram", icon: <Send className="h-6 w-6" />, color: "bg-blue-500" },
  { name: "Blog", icon: <FileText className="h-6 w-6" />, color: "bg-green-500" },
  {
    name: "TikTok",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
      </svg>
    ),
    color: "bg-black",
  },
]

const postTypes: PostTypeInfo[] = [
  { name: "text", icon: <Type className="h-6 w-6" /> },
  { name: "image", icon: <Image className="h-6 w-6" /> },
  { name: "video", icon: <Video className="h-6 w-6" /> },
]

const postStatuses = ["Pending", "Posted", "Failed"]

export default function Page() {
  const [contents, setContents] = useState<Content[]>([])
  const [filteredContents, setFilteredContents] = useState<Content[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, posted: 0, failed: 0 })
  const [platformStats, setPlatformStats] = useState<Record<string, number>>({})
  const [postTypeStats, setPostTypeStats] = useState<Record<string, number>>({})
  const [editingContent, setEditingContent] = useState<Content | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filters, setFilters] = useState({
    platform: "all",
    postType: "all",
    dateRange: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    status: "all",
  })
  const [isLoading, setIsLoading] = useState(true)
  const { register, handleSubmit, reset, control } = useForm()

  useEffect(() => {
    fetchContents()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [contents, filters])

  const fetchContents = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/contents")
      const result = await response.json()
      if (result.success) {
        setContents(result.data)
        updateStats(result.data)
      }
    } catch (error) {
      toast.error("Failed to fetch contents")
    } finally {
      setIsLoading(false)
    }
  }

  const updateStats = (data: Content[]) => {
    const newStats = {
      total: data.length,
      pending: data.filter((c) => c.status === "Pending").length,
      posted: data.filter((c) => c.status === "Posted").length,
      failed: data.filter((c) => c.status === "Failed").length,
    }
    setStats(newStats)

    const newPlatformStats: Record<string, number> = {}
    const newPostTypeStats: Record<string, number> = {}

    data.forEach((content) => {
      newPlatformStats[content.platformName] = (newPlatformStats[content.platformName] || 0) + 1
      newPostTypeStats[content.postType] = (newPostTypeStats[content.postType] || 0) + 1
    })

    setPlatformStats(newPlatformStats)
    setPostTypeStats(newPostTypeStats)
  }

  const applyFilters = () => {
    let filtered = contents

    if (filters.platform && filters.platform !== "all") {
      filtered = filtered.filter((content) => content.platformName === filters.platform)
    }

    if (filters.postType && filters.postType !== "all") {
      filtered = filtered.filter((content) => content.postType === filters.postType)
    }

    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((content) => content.status === filters.status)
    }

    if (filters.dateRange.from && filters.dateRange.to) {
      filtered = filtered.filter((content) => {
        const contentDate = parseISO(content.scheduleTime)
        return (
          (isAfter(contentDate, filters.dateRange.from!) || isEqual(contentDate, filters.dateRange.from!)) &&
          (isBefore(contentDate, filters.dateRange.to!) || isEqual(contentDate, filters.dateRange.to!))
        )
      })
    }

    setFilteredContents(filtered)
  }

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch("/api/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        toast.success("Content scheduled successfully")
        reset()
        fetchContents()
        setIsCreateDialogOpen(false)
      } else {
        toast.error("Failed to schedule content")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const deleteContent = async (id: string) => {
    try {
      const response = await fetch(`/api/contents/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast.success("Content deleted successfully")
        fetchContents()
      } else {
        toast.error("Failed to delete content")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const updateContent = async (id: string, data: Partial<Content>) => {
    try {
      const response = await fetch(`/api/contents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        toast.success("Content updated successfully")
        fetchContents()
        setEditingContent(null)
      } else {
        toast.error("Failed to update content")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Toaster position="top-right" />

      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Social Media Content Scheduler</h1>
        <p className="text-muted-foreground">Manage and track your social media content effortlessly</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="mr-2 h-5 w-5" />
              Platform Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(platformStats).map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {platforms.find((p) => p.name === platform)?.icon}
                      <span className="ml-2">{platform}</span>
                    </div>
                    <Badge>{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Post Type Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(postTypeStats).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {postTypes.find((p) => p.name === type)?.icon}
                      <span className="ml-2">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    </div>
                    <Badge>{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Posts" value={stats.total} color="bg-blue-500" icon={<FileText className="h-6 w-6" />} />
        <StatCard
          title="Pending"
          value={stats.pending}
          color="bg-yellow-500"
          icon={<AlertCircle className="h-6 w-6" />}
        />
        <StatCard title="Posted" value={stats.posted} color="bg-green-500" icon={<CheckCircle className="h-6 w-6" />} />
        <StatCard title="Failed" value={stats.failed} color="bg-red-500" icon={<XCircle className="h-6 w-6" />} />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center">
          <Sliders className="mr-2 h-6 w-6" />
          Content Management
        </h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Schedule New Content
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Content</DialogTitle>
              <DialogDescription>Create and schedule your social media content</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform</Label>
                  <Controller
                    name="platformName"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((platform) => (
                            <SelectItem key={platform.name} value={platform.name}>
                              <div className="flex items-center">
                                {platform.icon}
                                <span className="ml-2">{platform.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postType">Post Type</Label>
                  <Controller
                    name="postType"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select post type" />
                        </SelectTrigger>
                        <SelectContent>
                          {postTypes.map((type) => (
                            <SelectItem key={type.name} value={type.name}>
                              <div className="flex items-center">
                                {type.icon}
                                <span className="ml-2">{type.name.charAt(0).toUpperCase() + type.name.slice(1)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea {...register("content", { required: true })} placeholder="Enter your content here" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTime">Schedule Time</Label>
                <Input {...register("scheduleTime", { required: true })} type="datetime-local" />
              </div>
              <DialogFooter>
                <Button type="submit">Schedule Content</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Advanced Content Filters
          </CardTitle>
          <CardDescription>Refine your content view with powerful filtering options</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="filters" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="date-range">Date Range</TabsTrigger>
            </TabsList>
            <TabsContent value="filters">
              <div className="flex flex-wrap gap-4">
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="platformFilter">Platform</Label>
                  <Select onValueChange={(value) => setFilters((prev) => ({ ...prev, platform: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      {platforms.map((platform) => (
                        <SelectItem key={platform.name} value={platform.name}>
                          <div className="flex items-center">
                            {platform.icon}
                            <span className="ml-2">{platform.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="postTypeFilter">Post Type</Label>
                  <Select onValueChange={(value) => setFilters((prev) => ({ ...prev, postType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {postTypes.map((type) => (
                        <SelectItem key={type.name} value={type.name}>
                          <div className="flex items-center">
                            {type.icon}
                            <span className="ml-2">{type.name.charAt(0).toUpperCase() + type.name.slice(1)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="statusFilter">Status</Label>
                  <Select onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {postStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="date-range">
              <div className="space-y-4">
                <div>
                  <Label>Date Range</Label>
                  <div className="flex space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !filters.dateRange.from && "text-muted-foreground",
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {filters.dateRange.from ? (
                            format(filters.dateRange.from, "PPP")
                          ) : (
                            <span>Pick a start date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={filters.dateRange.from}
                          onSelect={(date) =>
                            setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, from: date } }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !filters.dateRange.to && "text-muted-foreground",
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : <span>Pick an end date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={filters.dateRange.to}
                          onSelect={(date) =>
                            setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, to: date } }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() =>
              setFilters({
                platform: "all",
                postType: "all",
                dateRange: { from: undefined, to: undefined },
                status: "all",
              })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Filters
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Content</CardTitle>
          <CardDescription>View and manage your scheduled content</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContents.map((content) => (
                  <ContentCard
                    key={content._id}
                    content={content}
                    onDelete={deleteContent}
                    onEdit={() => setEditingContent(content)}
                    onStatusChange={(newStatus) => updateContent(content._id, { status: newStatus })}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!editingContent} onOpenChange={() => setEditingContent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>Make changes to your scheduled content</DialogDescription>
          </DialogHeader>
          {editingContent && (
            <form onSubmit={handleSubmit((data) => updateContent(editingContent._id, data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea {...register("content", { required: true })} defaultValue={editingContent.content} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTime">Schedule Time</Label>
                <Input
                  {...register("scheduleTime", { required: true })}
                  type="datetime-local"
                  defaultValue={editingContent.scheduleTime}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                  name="status"
                  control={control}
                  defaultValue={editingContent.status}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {postStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  title,
  value,
  color,
  icon,
}: { title: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <Card className={`${color}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  )
}

function ContentCard({
  content,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  content: Content
  onDelete: (id: string) => void
  onEdit: () => void
  onStatusChange: (newStatus: string) => void
}) {
  const platform = platforms.find((p) => p.name === content.platformName) || platforms[0]
  const postType = postTypes.find((p) => p.name === content.postType) || postTypes[0]

  const statusIcon = {
    Pending: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    Posted: <CheckCircle className="h-5 w-5 text-green-500" />,
    Failed: <XCircle className="h-5 w-5 text-red-500" />,
  }[content.status]

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className={`${platform.color} text-white`}>
        <CardTitle className="flex items-center text-lg">
          {platform.icon}
          <span className="ml-2">{platform.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="flex items-center">
            {postType.icon}
            <span className="ml-1">{content.postType.toUpperCase()}</span>
          </Badge>
          <div className="flex items-center space-x-2">
            {statusIcon}
            <span className="text-sm font-medium">{content.status}</span>
          </div>
        </div>
        <p className="text-sm mb-2 line-clamp-2">{content.content}</p>
        <p className="text-xs text-muted-foreground mb-4">
          Scheduled: {format(parseISO(content.scheduleTime), "PPpp")}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure you want to delete this content?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your scheduled content.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => onDelete(content._id)}>
                    Confirm Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor={`status-${content._id}`} className="text-sm">
              Mark as Posted
            </Label>
            <Switch
              id={`status-${content._id}`}
              checked={content.status === "Posted"}
              onCheckedChange={(checked) => onStatusChange(checked ? "Posted" : "Pending")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
