"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileVideo,
  FileIcon as FilePdf,
  FileAudio,
  FileText,
  Upload,
  Search,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Grid,
  List,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react"
import ReactPlayer from "react-player"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"

// Types
interface Training {
  _id: string
  title: string
  description: string
  type: "video" | "pdf" | "audio" | "text"
  fileUrl?: string
  uploadStatus: "pending" | "uploading" | "completed" | "failed"
  uploadProgress: number
}

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<Training[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("title")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const [newTraining, setNewTraining] = useState({
    title: "",
    description: "",
    type: "video" as const,
  })
  const [isCreating, setIsCreating] = useState(false)
  const playerRef = useRef<ReactPlayer>(null)

  // Fetch trainings
  const fetchTrainings = useCallback(async () => {
    try {
      const response = await fetch("/api/training")
      const data = await response.json()
      setTrainings(data)
    } catch (error) {
      toast.error("Failed to fetch trainings")
    }
  }, [])

  useEffect(() => {
    fetchTrainings()
  }, [fetchTrainings])

  // File upload handling
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setIsUploading(true)
      const formData = new FormData()
      formData.append("title", newTraining.title)
      formData.append("description", newTraining.description)
      formData.append("type", newTraining.type)
      formData.append("file", file)

      try {
        const response = await fetch("/api/training", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) throw new Error("Upload failed")

        toast.success("Training uploaded successfully")
        setIsCreating(false)
        fetchTrainings()
      } catch (error) {
        toast.error("Failed to upload training")
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
        setNewTraining({ title: "", description: "", type: "video" })
      }
    },
    [newTraining, fetchTrainings],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".webm"],
      "audio/*": [".mp3", ".wav"],
      "application/pdf": [".pdf"],
      "text/*": [".txt", ".md"],
    },
    disabled: !newTraining.title || !newTraining.description,
  })

  // Delete training
  const deleteTraining = async (id: string) => {
    try {
      await fetch(`/api/training/${id}`, {
        method: "DELETE",
      })
      toast.success("Training deleted successfully")
      fetchTrainings()
    } catch (error) {
      toast.error("Failed to delete training")
    }
  }

  // Filter and sort trainings
  const filteredTrainings = trainings
    .filter(
      (training) =>
        training.title.toLowerCase().includes(search.toLowerCase()) &&
        (typeFilter === "all" || training.type === typeFilter),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title)
        case "status":
          return a.uploadStatus.localeCompare(b.uploadStatus)
        case "progress":
          return b.uploadProgress - a.uploadProgress
        default:
          return 0
      }
    })

  // Get icon by type
  const getIcon = (type: string) => {
    switch (type) {
      case "video":
        return <FileVideo className="w-5 h-5" />
      case "pdf":
        return <FilePdf className="w-5 h-5" />
      case "audio":
        return <FileAudio className="w-5 h-5" />
      case "text":
        return <FileText className="w-5 h-5" />
      default:
        return null
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        )
      case "uploading":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Unknown
          </Badge>
        )
    }
  }

  // Download handler
  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage training materials</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Create Training
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Training</DialogTitle>
              <DialogDescription>Fill in the training details and upload your content</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter training title"
                    value={newTraining.title}
                    onChange={(e) => setNewTraining((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter training description"
                    value={newTraining.description}
                    onChange={(e) => setNewTraining((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newTraining.type}
                    onValueChange={(value: "video" | "pdf" | "audio" | "text") =>
                      setNewTraining((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
                  ${!newTraining.title || !newTraining.description ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {!newTraining.title || !newTraining.description
                    ? "Please fill in the title and description first"
                    : "Drag and drop your file here or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Supported formats: Video, Audio, PDF, Text</p>
              </div>
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search and Filter</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search trainings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[200px]">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {viewMode === "grid" ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filteredTrainings.map((training) => (
              <motion.div
                key={training._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group"
              >
                <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-secondary rounded-lg">{getIcon(training.type)}</div>
                        {getStatusBadge(training.uploadStatus)}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the training material and
                              remove all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTraining(training._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="flex items-center justify-between">
                        <span>{training.title}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-normal">{training.type}</span>
                                <span className="text-sm font-normal">•</span>
                                <span className="text-sm font-normal">{training.uploadProgress}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Type: {training.type}</p>
                              <p>Status: {training.uploadStatus}</p>
                              <p>Progress: {training.uploadProgress}%</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </CardTitle>
                      <CardDescription className="line-clamp-2">{training.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {training.uploadStatus === "uploading" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Uploading...</span>
                          <span className="text-muted-foreground">{training.uploadProgress}%</span>
                        </div>
                        <Progress value={training.uploadProgress} className="w-full" />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <div className="w-full flex justify-between">
                      <Button
                        className="flex-1 mr-2"
                        onClick={() => setSelectedTraining(training)}
                        disabled={training.uploadStatus !== "completed"}
                      >
                        View Content
                      </Button>
                      {(training.type === "pdf" || training.type === "audio") && training.fileUrl && (
                        <Button
                          variant="outline"
                          onClick={() => handleDownload(training.fileUrl!, `${training.title}.${training.type}`)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainings.map((training) => (
                  <TableRow key={training._id}>
                    <TableCell>{getIcon(training.type)}</TableCell>
                    <TableCell className="font-medium">{training.title}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{training.description}</TableCell>
                    <TableCell>{getStatusBadge(training.uploadStatus)}</TableCell>
                    <TableCell>
                      <Progress value={training.uploadProgress} className="w-full" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTraining(training)}
                          disabled={training.uploadStatus !== "completed"}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        {(training.type === "pdf" || training.type === "audio") && training.fileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(training.fileUrl!, `${training.title}.${training.type}`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the training material and
                                remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTraining(training._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </AnimatePresence>

      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.title}</DialogTitle>
            <DialogDescription>{selectedTraining?.description}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              {selectedTraining?.type === "video" && selectedTraining.fileUrl && (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <ReactPlayer
                    ref={playerRef}
                    url={selectedTraining.fileUrl}
                    width="100%"
                    height="100%"
                    playing={isPlaying}
                    muted={isMuted}
                    controls
                    config={{
                      file: {
                        attributes: {
                          controlsList: "nodownload",
                        },
                      },
                    }}
                  />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                    <Button size="icon" variant="secondary" onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="secondary" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => {
                        const element = document.documentElement
                        if (element.requestFullscreen) {
                          element.requestFullscreen()
                        }
                      }}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {selectedTraining?.type === "pdf" && selectedTraining.fileUrl && (
                <iframe
                  src={selectedTraining.fileUrl}
                  className="w-full h-[600px] border rounded-lg"
                  title={selectedTraining.title}
                />
              )}
              {selectedTraining?.type === "audio" && selectedTraining.fileUrl && (
                <audio controls className="w-full">
                  <source src={selectedTraining.fileUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              )}
              {selectedTraining?.type === "text" && selectedTraining.fileUrl && (
                <div className="max-h-[600px] overflow-y-auto p-4 border rounded-lg">
                  <pre className="whitespace-pre-wrap">{selectedTraining.fileUrl}</pre>
                </div>
              )}
            </TabsContent>
            <TabsContent value="details">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getIcon(selectedTraining?.type || "")}
                      <span className="capitalize">{selectedTraining?.type}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedTraining?.uploadStatus || "")}</div>
                  </div>
                  <div>
                    <Label>Upload Progress</Label>
                    <Progress value={selectedTraining?.uploadProgress} className="mt-2" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-muted-foreground">{selectedTraining?.description}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

