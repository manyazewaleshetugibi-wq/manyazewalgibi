"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Toaster, toast } from "react-hot-toast"
import {
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Video,
  Music,
  Globe,
  Star,
  RefreshCcw,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
  Youtube,
  Link2,
  ExternalLink,
  FileText,
  Clock,
  Database,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronDown,
} from 'lucide-react'

// Types based on your data structure
type BaseApplication = {
  _id: string
  fullName: string
  email: string
  phone: string
  address: string
  gender: string
  language: string
  createdAt: string
  updatedAt: string
}

type PodcastApplication = BaseApplication & {
  videoLink: string
  audioLink?: string
}

type EntenfisApplication = BaseApplication & {
  dateOfBirth: string
  occupation: string
  guestBio: string
  expertise: string
  achievements: string
  socialMediaLinks: string
  programTopic: string
  programDate: string
  programTime?: string
  interviewLanguage: string
  specialRequirements: string
  introductionVideo: string
}

type Application = PodcastApplication | EntenfisApplication

type Statistics = {
  podcastApplications: number
  entenfisApplications: number
  totalApplications: number
}

// Video Player Component
const VideoPlayer = ({ url, title }: { url: string; title: string }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = ''
        if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split('?')[0]
        } else if (url.includes('watch?v=')) {
          videoId = url.split('watch?v=')[1]?.split('&')[0]
        } else if (url.includes('embed/')) {
          videoId = url.split('embed/')[1]?.split('?')[0]
        }
        if (videoId) {
          setEmbedUrl(`https://www.youtube.com/embed/${videoId}`)
        }
      } else if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
        if (videoId) {
          setEmbedUrl(`https://player.vimeo.com/video/${videoId}`)
        }
      } else if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
        const fileId = url.match(/[-\w]{25,}/)
        if (fileId) {
          setEmbedUrl(`https://drive.google.com/file/d/${fileId[0]}/preview`)
        } else {
          setEmbedUrl(url)
        }
      } else {
        setEmbedUrl(url)
      }
    } catch (error) {
      console.error('Error parsing video URL:', error)
      setEmbedUrl(url)
    }
  }, [url])

  if (!url) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
        <span className="text-muted-foreground">No video link provided</span>
      </div>
    )
  }

  if (!embedUrl) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center text-purple-600 hover:underline"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Video Link
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative pt-[56.25%] bg-gray-100 rounded-lg overflow-hidden border">
        {isPlaying ? (
          <iframe
            src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
            title={title}
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/5">
            <Youtube className="h-12 w-12 text-red-600 mb-2" />
            <Button onClick={() => setIsPlaying(true)} variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700">
              Play Video
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground truncate max-w-[300px]">{url}</span>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-purple-600 hover:underline flex items-center ml-2"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open
        </a>
      </div>
    </div>
  )
}

// Application Card Component
const ApplicationCard = ({ 
  application, 
  type,
  onView,
  onDelete 
}: { 
  application: Application
  type: 'podcast' | 'entenfis'
  onView: (app: Application) => void
  onDelete: (id: string, type: string) => void
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getVideoCount = () => {
    if (type === 'podcast' && 'videoLink' in application) {
      return application.videoLink ? 1 : 0
    } else if (type === 'entenfis' && 'guestBio' in application) {
      let count = 0
      if (application.expertise) count++
      if (application.achievements) count++
      if (application.programTopic) count++
      if (application.socialMediaLinks) count++
      if (application.introductionVideo) count++
      if (application.specialRequirements) count++
      return count
    }
    return 0
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-600">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 bg-purple-100">
              <AvatarFallback className="bg-purple-600 text-white">
                {getInitials(application.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center">
                {application.fullName}
                {application.language === 'am' && (
                  <Badge variant="outline" className="ml-2 text-xs">አማርኛ</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                {application.email}
              </p>
            </div>
          </div>
          <Badge className={type === 'podcast' ? 'bg-blue-600' : 'bg-purple-600'}>
            {type === 'podcast' ? 'Podcast' : 'Entenfis'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{application.phone}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{application.address}</span>
          </div>
        </div>

        {type === 'podcast' && 'videoLink' in application && application.videoLink && (
          <div className="flex items-center text-sm bg-blue-50 p-2 rounded">
            <Video className="h-4 w-4 mr-2 text-blue-600" />
            <span className="truncate flex-1">Video submitted</span>
            <Badge variant="outline" className="ml-2">1 video</Badge>
          </div>
        )}

        {type === 'entenfis' && 'guestBio' in application && (
          <div className="space-y-2">
            <div className="flex items-center text-sm bg-purple-50 p-2 rounded">
              <Briefcase className="h-4 w-4 mr-2 text-purple-600" />
              <span className="flex-1">{application.occupation}</span>
            </div>
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-orange-600" />
              <span>Program: {formatDate(application.programDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Video className="h-4 w-4 mr-2 text-green-600" />
                <span>{getVideoCount()} videos</span>
              </div>
              {application.interviewLanguage && (
                <Badge variant="secondary">{application.interviewLanguage}</Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatDate(application.createdAt)}
          </div>
          <Badge variant="outline" className="text-xs">
            ID: {application._id.slice(-6)}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 bg-gray-50 rounded-b-lg">
        <Button variant="ghost" size="sm" onClick={() => onView(application)} className="flex-1 mr-2">
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(application._id, type)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}

// Application Details Modal
const ApplicationDetailsModal = ({ 
  application, 
  type, 
  isOpen, 
  onClose 
}: { 
  application: Application | null
  type: 'podcast' | 'entenfis'
  isOpen: boolean
  onClose: () => void
}) => {
  if (!application) return null

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isPodcast = type === 'podcast'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <User className="mr-2 h-6 w-6 text-purple-600" />
            {application.fullName}
          </DialogTitle>
          <DialogDescription>
            {isPodcast ? 'Podcast Application' : 'Entenfis Program Application'} • ID: {application._id}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <User className="mr-2 h-5 w-5 text-purple-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{application.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{application.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{application.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{application.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium capitalize">{application.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Language</p>
                    <Badge variant="secondary">{application.language === 'am' ? 'አማርኛ' : 'English'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Podcast Specific Fields */}
            {isPodcast && 'videoLink' in application && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Video className="mr-2 h-5 w-5 text-blue-600" />
                    Media Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Video Link</p>
                    <VideoPlayer url={application.videoLink} title={`${application.fullName}'s Video`} />
                  </div>
                  {application.audioLink && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Audio Link</p>
                      <a 
                        href={application.audioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:underline"
                      >
                        <Music className="h-4 w-4 mr-2" />
                        Listen to Audio
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Entenfis Specific Fields */}
            {!isPodcast && 'guestBio' in application && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Briefcase className="mr-2 h-5 w-5 text-green-600" />
                      Professional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{application.dateOfBirth}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Occupation</p>
                        <p className="font-medium">{application.occupation}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Guest Bio</p>
                      <p className="font-medium bg-gray-50 p-3 rounded">{application.guestBio}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Expertise Video</p>
                      <VideoPlayer url={application.expertise} title="Expertise Video" />
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Achievements Video</p>
                      <VideoPlayer url={application.achievements} title="Achievements Video" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Star className="mr-2 h-5 w-5 text-yellow-600" />
                      Program Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Program Topic Video</p>
                      <VideoPlayer url={application.programTopic} title="Program Topic Video" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Program Date</p>
                        <p className="font-medium">{application.programDate}</p>
                      </div>
                      {application.programTime && (
                        <div>
                          <p className="text-sm text-muted-foreground">Program Time</p>
                          <p className="font-medium">{application.programTime}</p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Interview Language</p>
                      <Badge variant="secondary">{application.interviewLanguage}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5 text-purple-600" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Social Media Links Video</p>
                      <VideoPlayer url={application.socialMediaLinks} title="Social Media Links" />
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Introduction Video</p>
                      <VideoPlayer url={application.introductionVideo} title="Introduction Video" />
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Special Requirements Video</p>
                      <VideoPlayer url={application.specialRequirements} title="Special Requirements" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Database className="mr-2 h-5 w-5 text-gray-600" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Collection</p>
                    <Badge variant="outline">
                      {type === 'podcast' ? 'podcastapplications' : 'entenfisapplications'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Database</p>
                    <Badge variant="outline">podcast-app</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="text-sm">{formatDate(application.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-sm">{formatDate(application.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Component
export default function ApplicationsPage() {
  const [podcastApplications, setPodcastApplications] = useState<PodcastApplication[]>([])
  const [entenfisApplications, setEntenfisApplications] = useState<EntenfisApplication[]>([])
  const [statistics, setStatistics] = useState<Statistics>({
    podcastApplications: 0,
    entenfisApplications: 0,
    totalApplications: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<'podcast' | 'entenfis'>('podcast')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [applicationToDelete, setApplicationToDelete] = useState<{ id: string; type: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(12)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('/api/applications', {
        method: 'PUT'
      })
      if (response.ok) {
        const data = await response.json()
        setStatistics(data.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }, [])

  // Fetch applications based on type
  const fetchApplications = useCallback(async (type: 'podcast' | 'entenfis') => {
    try {
      setLoading(true)
      const url = `/api/applications?type=${type}&page=${currentPage}&limit=${itemsPerPage}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} applications`)
      }

      const data = await response.json()
      
      if (type === 'podcast') {
        setPodcastApplications(data.data)
      } else {
        setEntenfisApplications(data.data)
      }
      
      setTotalPages(data.pagination.pages)
      setError(null)
      
      // Refresh statistics
      await fetchStatistics()
    } catch (err: any) {
      setError(err.message)
      toast.error(`Failed to fetch ${type} applications`)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [currentPage, itemsPerPage, searchTerm, fetchStatistics])

  // Initial load
  useEffect(() => {
    fetchApplications(selectedType)
  }, [selectedType, currentPage, fetchApplications])

  // Initial statistics load
  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchApplications(selectedType)
  }

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application)
    setIsDetailsOpen(true)
  }

  const handleDelete = (id: string, type: string) => {
    setApplicationToDelete({ id, type })
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!applicationToDelete) return

    try {
      const response = await fetch(
        `/api/applications?id=${applicationToDelete.id}&type=${applicationToDelete.type}`, 
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete application')
      }

      toast.success('Application deleted successfully')
      fetchApplications(selectedType)
      fetchStatistics()
      setIsDeleteDialogOpen(false)
      setApplicationToDelete(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const currentApplications = selectedType === 'podcast' ? podcastApplications : entenfisApplications

  // Apply filters
  const filteredApplications = currentApplications.filter(app => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'amharic') return app.language === 'am'
    if (filterStatus === 'english') return app.language === 'en'
    return true
  })

  // Pagination
  const paginatedApplications = filteredApplications

  if (loading && !isRefreshing) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        
        {/* Cards Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Database className="mr-2 h-8 w-8 text-purple-600" />
            Applications Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Database: <span className="font-mono bg-gray-100 px-2 py-1 rounded">podcast-app</span>
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{statistics.totalApplications}</div>
            <p className="text-xs text-purple-600 mt-1">Across all collections</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Podcast Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{statistics.podcastApplications}</div>
            <p className="text-xs text-blue-600 mt-1">podcastapplications collection</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Entenfis Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{statistics.entenfisApplications}</div>
            <p className="text-xs text-purple-600 mt-1">entenfisapplications collection</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-green-700">
                  {[...podcastApplications, ...entenfisApplications].filter(app => app.language === 'am').length}
                </span>
                <span className="text-xs text-green-600 ml-1">አማርኛ</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-blue-700">
                  {[...podcastApplications, ...entenfisApplications].filter(app => app.language === 'en').length}
                </span>
                <span className="text-xs text-blue-600 ml-1">English</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as 'podcast' | 'entenfis')}>
          <TabsList>
            <TabsTrigger value="podcast" className="flex items-center">
              <Music className="h-4 w-4 mr-2" />
              Podcast
              <Badge variant="secondary" className="ml-2">{statistics.podcastApplications}</Badge>
            </TabsTrigger>
            <TabsTrigger value="entenfis" className="flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Entenfis
              <Badge variant="secondary" className="ml-2">{statistics.entenfisApplications}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="amharic">አማርኛ</SelectItem>
              <SelectItem value="english">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Applications Grid */}
      {paginatedApplications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No applications found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search' : `No ${selectedType} applications in the database`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedApplications.map((app) => (
            <ApplicationCard
              key={app._id}
              application={app}
              type={selectedType}
              onView={handleViewDetails}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  onClick={() => setCurrentPage(i + 1)}
                  isActive={currentPage === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Details Modal */}
      <ApplicationDetailsModal
        application={selectedApplication}
        type={selectedType}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this application? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}