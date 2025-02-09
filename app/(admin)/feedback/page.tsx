"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"
import { Search, Plus, Edit, Trash2 } from "lucide-react"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Feedback {
  _id: string
  fullName: string
  rating?: number
  message: string
  visibility: "PRIVATE" | "PUBLIC"
  createdAt: string
  updatedAt: string
}

const ITEMS_PER_PAGE = 5

export default function FeedbackManagement() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [filteredFeedback, setFilteredFeedback] = useState<Feedback[]>([])
  const [newFeedback, setNewFeedback] = useState<Partial<Feedback>>({
    fullName: "",
    rating: 0,
    message: "",
    visibility: "PRIVATE",
  })
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    fetchFeedback()
  }, [])

  useEffect(() => {
    const filtered = feedbackList.filter(
      (feedback) =>
        feedback.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredFeedback(filtered)
    setCurrentPage(1)
  }, [searchTerm, feedbackList])

  const fetchFeedback = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/feedback")
      const data = await response.json()
      if (data.success) {
        setFeedbackList(data.feedback)
        setFilteredFeedback(data.feedback)
      }
    } catch (error) {
      console.error("Error fetching feedback:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFeedback),
      })
      if (response.ok) {
        fetchFeedback()
        setNewFeedback({ fullName: "", rating: 0, message: "", visibility: "PRIVATE" })
        setIsAddModalOpen(false)
      }
    } catch (error) {
      console.error("Error adding feedback:", error)
    }
  }

  const handleUpdateFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFeedback) return
    try {
      const response = await fetch(`/api/feedback/${editingFeedback._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingFeedback),
      })
      if (response.ok) {
        fetchFeedback()
        setEditingFeedback(null)
        setIsEditModalOpen(false)
      }
    } catch (error) {
      console.error("Error updating feedback:", error)
    }
  }

  const handleDeleteFeedback = async (id: string) => {
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchFeedback()
      }
    } catch (error) {
      console.error("Error deleting feedback:", error)
    }
  }

  const paginatedFeedback = filteredFeedback.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const totalPages = Math.ceil(filteredFeedback.length / ITEMS_PER_PAGE)

  const chartData = {
    labels: ["1", "2", "3", "4", "5"],
    datasets: [
      {
        label: "Ratings Distribution",
        data: [1, 2, 3, 4, 5].map((rating) => feedbackList.filter((f) => f.rating === rating).length),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Feedback Ratings Distribution",
      },
    },
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Feedback Management Dashboard</h1>

      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-8"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Feedback
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Feedback</DialogTitle>
              <DialogDescription>Fill in the details to add new feedback.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddFeedback} className="space-y-4">
              <Input
                placeholder="Full Name"
                value={newFeedback.fullName}
                onChange={(e) => setNewFeedback({ ...newFeedback, fullName: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Rating"
                value={newFeedback.rating}
                onChange={(e) => setNewFeedback({ ...newFeedback, rating: Number.parseInt(e.target.value, 10) })}
              />
              <Textarea
                placeholder="Message"
                value={newFeedback.message}
                onChange={(e) => setNewFeedback({ ...newFeedback, message: e.target.value })}
              />
              <Select
                value={newFeedback.visibility}
                onValueChange={(value) => setNewFeedback({ ...newFeedback, visibility: value as "PRIVATE" | "PUBLIC" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button type="submit">Add Feedback</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

    

      <Card>
        <CardHeader>
          <CardTitle>Feedback List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFeedback.map((feedback) => (
                  <TableRow key={feedback._id}>
                    <TableCell>{feedback.fullName}</TableCell>
                    <TableCell>{feedback.rating}</TableCell>
                    <TableCell>{feedback.message.substring(0, 50)}...</TableCell>
                    <TableCell>{feedback.visibility}</TableCell>
                    <TableCell>{new Date(feedback.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => setEditingFeedback(feedback)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Feedback</DialogTitle>
                              <DialogDescription>Update the feedback details.</DialogDescription>
                            </DialogHeader>
                            {editingFeedback && (
                              <form onSubmit={handleUpdateFeedback} className="space-y-4">
                                <Input
                                  placeholder="Full Name"
                                  value={editingFeedback.fullName}
                                  onChange={(e) => setEditingFeedback({ ...editingFeedback, fullName: e.target.value })}
                                />
                                <Input
                                  type="number"
                                  placeholder="Rating"
                                  value={editingFeedback.rating}
                                  onChange={(e) =>
                                    setEditingFeedback({
                                      ...editingFeedback,
                                      rating: Number.parseInt(e.target.value, 10),
                                    })
                                  }
                                />
                                <Textarea
                                  placeholder="Message"
                                  value={editingFeedback.message}
                                  onChange={(e) => setEditingFeedback({ ...editingFeedback, message: e.target.value })}
                                />
                                <Select
                                  value={editingFeedback.visibility}
                                  onValueChange={(value) =>
                                    setEditingFeedback({
                                      ...editingFeedback,
                                      visibility: value as "PRIVATE" | "PUBLIC",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select visibility" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PRIVATE">Private</SelectItem>
                                    <SelectItem value="PUBLIC">Public</SelectItem>
                                  </SelectContent>
                                </Select>
                                <DialogFooter>
                                  <Button type="submit">Update Feedback</Button>
                                </DialogFooter>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the feedback.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteFeedback(feedback._id)}>
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
          )}
        </CardContent>
        <CardFooter>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} />
              </PaginationItem>
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink isActive={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>
    </div>
  )
}

