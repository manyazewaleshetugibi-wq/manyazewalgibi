"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Mic, 
  Heart, 
  Plus, 
  Search, 
  Filter,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Tag,
  Star,
  XCircle,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  Download,
  UserPlus,
  MessageSquare,
  Building,
  Mail,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

// ============================================================================
// TYPES
// ============================================================================

interface PodcastGuest {
  _id: string
  serialNumber: number
  fullName: string
  workSector: string
  phoneNumber: string
  scheduledDate: string
  scheduledTime: string
  additionalNotes: string
  createdAt: string
  updatedAt: string
}

interface EntenfesCase {
  _id: string
  serialNumber: number
  userName: string
  phoneNumber: string
  category: 'Family' | 'Work' | 'Health' | 'Financial' | 'Spiritual' | 'Other'
  summary: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Called' | 'AppointmentScheduled' | 'InProgress' | 'Resolved' | 'Pending'
  createdAt: string
  updatedAt: string
}

// New Interface for Others/General Contacts
interface OtherContact {
  _id: string
  serialNumber: number
  fullName: string
  phoneNumber: string
  email: string
  location: string
  reasonForCall: string
  callType: 'Prayer' | 'Counseling' | 'Information' | 'Complaint' | 'Suggestion' | 'Testimony' | 'Other'
  message: string
  followUpNeeded: boolean
  followUpDate: string
  status: 'New' | 'InProgress' | 'FollowedUp' | 'Resolved' | 'Closed'
  notes: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

// Podcast Guests APIs
async function fetchPodcastGuests(): Promise<PodcastGuest[]> {
  const response = await fetch("/api/podcastandentenfs/podcast-guests")
  if (!response.ok) throw new Error("Failed to fetch podcast guests")
  const data = await response.json()
  return data.data || []
}

async function createPodcastGuest(data: Partial<PodcastGuest>): Promise<PodcastGuest> {
  const response = await fetch('/api/podcastandentenfs/podcast-guests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to create guest")
  const result = await response.json()
  return result.data
}

async function updatePodcastGuest(id: string, data: Partial<PodcastGuest>): Promise<PodcastGuest> {
  const response = await fetch(`/api/podcastandentenfs/podcast-guests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to update guest")
  const result = await response.json()
  return result.data
}

async function deletePodcastGuest(id: string): Promise<boolean> {
  const response = await fetch(`/api/podcastandentenfs/podcast-guests/${id}`, { method: 'DELETE' })
  return response.ok
}

// Entenfes Cases APIs
async function fetchEntenfesCases(): Promise<EntenfesCase[]> {
  const response = await fetch("/api/podcastandentenfs/entenfes-cases")
  if (!response.ok) throw new Error("Failed to fetch cases")
  const data = await response.json()
  return data.data || []
}

async function createEntenfesCase(data: Partial<EntenfesCase>): Promise<EntenfesCase> {
  const response = await fetch('/api/podcastandentenfs/entenfes-cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to create case")
  const result = await response.json()
  return result.data
}

async function updateEntenfesCase(id: string, data: Partial<EntenfesCase>): Promise<EntenfesCase> {
  const response = await fetch(`/api/podcastandentenfs/entenfes-cases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to update case")
  const result = await response.json()
  return result.data
}

async function deleteEntenfesCase(id: string): Promise<boolean> {
  const response = await fetch(`/api/podcastandentenfs/entenfes-cases/${id}`, { method: 'DELETE' })
  return response.ok
}

// Other Contacts APIs
async function fetchOtherContacts(): Promise<OtherContact[]> {
  const response = await fetch("/api/podcastandentenfs/other-contacts")
  if (!response.ok) throw new Error("Failed to fetch other contacts")
  const data = await response.json()
  return data.data || []
}

async function createOtherContact(data: Partial<OtherContact>): Promise<OtherContact> {
  const response = await fetch('/api/podcastandentenfs/other-contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to create contact")
  const result = await response.json()
  return result.data
}

async function updateOtherContact(id: string, data: Partial<OtherContact>): Promise<OtherContact> {
  const response = await fetch(`/api/podcastandentenfs/other-contacts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to update contact")
  const result = await response.json()
  return result.data
}

async function deleteOtherContact(id: string): Promise<boolean> {
  const response = await fetch(`/api/podcastandentenfs/other-contacts/${id}`, { method: 'DELETE' })
  return response.ok
}

// ============================================================================
// RETREAT PARTICIPANTS TABLE
// ============================================================================

// ============================================================================
// PODCAST GUESTS TABLE
// ============================================================================

function PodcastGuestsTable() {
  const [guests, setGuests] = useState<PodcastGuest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PodcastGuest | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<Partial<PodcastGuest>>({
    serialNumber: 0,
    fullName: "",
    workSector: "",
    phoneNumber: "",
    scheduledDate: "",
    scheduledTime: "",
    additionalNotes: "",
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchPodcastGuests()
      setGuests(data)
    } catch (error) {
      console.error("Error loading guests:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredGuests = guests.filter(g => 
    g.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.workSector.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phoneNumber.includes(searchTerm)
  )

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await updatePodcastGuest(editingItem._id, formData)
        toast({ title: "Success", description: "Guest updated successfully" })
      } else {
        await createPodcastGuest({ ...formData, serialNumber: guests.length + 1 })
        toast({ title: "Success", description: "Guest added successfully" })
      }
      await loadData()
      setShowForm(false)
      setEditingItem(null)
      resetForm()
    } catch (error) {
      console.error("Error saving:", error)
      toast({ title: "Error", description: "Failed to save guest", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({
      serialNumber: 0,
      fullName: "",
      workSector: "",
      phoneNumber: "",
      scheduledDate: "",
      scheduledTime: "",
      additionalNotes: "",
    })
  }

  const handleEdit = (item: PodcastGuest) => {
    setEditingItem(item)
    setFormData(item)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this guest?")) {
      try {
        await deletePodcastGuest(id)
        await loadData()
        toast({ title: "Success", description: "Guest deleted successfully" })
      } catch (error) {
        console.error("Error deleting:", error)
        toast({ title: "Error", description: "Failed to delete guest", variant: "destructive" })
      }
    }
  }

  if (isLoading) return <Skeleton className="h-[300px] w-full" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search guests..." 
            className="pl-10 w-[250px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => { resetForm(); setEditingItem(null); setShowForm(true); }} className="bg-purple-600">
          <Plus className="mr-2 h-4 w-4" />
          Add Guest
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Guest Name</TableHead>
                  <TableHead>Work Sector</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Additional Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((g) => (
                  <TableRow key={g._id} className="hover:bg-muted/50">
                    <TableCell>{g.serialNumber}</TableCell>
                    <TableCell className="font-medium">{g.fullName}</TableCell>
                    <TableCell>{g.workSector || "—"}</TableCell>
                    <TableCell>{g.phoneNumber}</TableCell>
                    <TableCell>
                      {g.scheduledDate && (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(g.scheduledDate).toLocaleDateString()}
                          {g.scheduledTime && (
                            <>
                              <Clock className="h-3 w-3 ml-2" />
                              {g.scheduledTime}
                            </>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{g.additionalNotes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(g)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(g._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredGuests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No guests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Guest" : "Add New Podcast Guest"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update guest information" : "Enter details for a podcast guest"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Full Name *</Label>
              <Input 
                value={formData.fullName || ""} 
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label>Work Sector</Label>
              <Input 
                value={formData.workSector || ""} 
                onChange={(e) => setFormData({ ...formData, workSector: e.target.value })}
                placeholder="e.g., Technology, Music, Business"
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input 
                value={formData.phoneNumber || ""} 
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input 
                type="date"
                value={formData.scheduledDate || ""} 
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Scheduled Time</Label>
              <Input 
                type="time"
                value={formData.scheduledTime || ""} 
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Additional Notes</Label>
              <Textarea 
                value={formData.additionalNotes || ""} 
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="Any additional information about the guest"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingItem ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// ENTENFES CASES TABLE
// ============================================================================

function EntenfesCasesTable() {
  const [cases, setCases] = useState<EntenfesCase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<EntenfesCase | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [formData, setFormData] = useState<Partial<EntenfesCase>>({
    serialNumber: 0,
    userName: "",
    phoneNumber: "",
    category: "Other",
    summary: "",
    priority: "Medium",
    status: "Pending",
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchEntenfesCases()
      setCases(data)
    } catch (error) {
      console.error("Error loading cases:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredCases = cases.filter(c => {
    const matchSearch = c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.phoneNumber.includes(searchTerm) ||
                        c.summary.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = filterCategory === "all" || c.category === filterCategory
    return matchSearch && matchCategory
  })

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await updateEntenfesCase(editingItem._id, formData)
        toast({ title: "Success", description: "Case updated successfully" })
      } else {
        await createEntenfesCase({ ...formData, serialNumber: cases.length + 1 })
        toast({ title: "Success", description: "Case added successfully" })
      }
      await loadData()
      setShowForm(false)
      setEditingItem(null)
      resetForm()
    } catch (error) {
      console.error("Error saving:", error)
      toast({ title: "Error", description: "Failed to save case", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({
      serialNumber: 0,
      userName: "",
      phoneNumber: "",
      category: "Other",
      summary: "",
      priority: "Medium",
      status: "Pending",
    })
  }

  const handleEdit = (item: EntenfesCase) => {
    setEditingItem(item)
    setFormData(item)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this case?")) {
      try {
        await deleteEntenfesCase(id)
        await loadData()
        toast({ title: "Success", description: "Case deleted successfully" })
      } catch (error) {
        console.error("Error deleting:", error)
        toast({ title: "Error", description: "Failed to delete case", variant: "destructive" })
      }
    }
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      High: "bg-red-100 text-red-700",
      Medium: "bg-yellow-100 text-yellow-700",
      Low: "bg-green-100 text-green-700",
    }
    return styles[priority as keyof typeof styles] || "bg-gray-100 text-gray-700"
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Called: "bg-blue-100 text-blue-700",
      AppointmentScheduled: "bg-purple-100 text-purple-700",
      InProgress: "bg-yellow-100 text-yellow-700",
      Resolved: "bg-green-100 text-green-700",
      Pending: "bg-gray-100 text-gray-700",
    }
    const displayStatus = status.replace(/([A-Z])/g, ' $1').trim()
    return { className: styles[status] || "bg-gray-100 text-gray-700", display: displayStatus }
  }

  if (isLoading) return <Skeleton className="h-[300px] w-full" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search cases..." 
              className="pl-10 w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Family">Family</SelectItem>
              <SelectItem value="Work">Work</SelectItem>
              <SelectItem value="Health">Health</SelectItem>
              <SelectItem value="Financial">Financial</SelectItem>
              <SelectItem value="Spiritual">Spiritual</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setEditingItem(null); setShowForm(true); }} className="bg-red-600">
          <Plus className="mr-2 h-4 w-4" />
          Add Case
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => {
                  const statusInfo = getStatusBadge(c.status)
                  return (
                    <TableRow key={c._id} className="hover:bg-muted/50">
                      <TableCell>{c.serialNumber}</TableCell>
                      <TableCell className="font-medium">{c.userName}</TableCell>
                      <TableCell>{c.phoneNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.summary || "—"}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadge(c.priority)}>
                          {c.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.className}>
                          {statusInfo.display}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(c._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredCases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No cases found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Case" : "Add New Case"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update case information" : "Enter details for an Entenfes case"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>User Name *</Label>
              <Input 
                value={formData.userName || ""} 
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                placeholder="Enter user name"
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input 
                value={formData.phoneNumber || ""} 
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select 
                value={formData.category || "Other"} 
                onValueChange={(v: any) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Financial">Financial</SelectItem>
                  <SelectItem value="Spiritual">Spiritual</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select 
                value={formData.priority || "Medium"} 
                onValueChange={(v: any) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Case Summary</Label>
              <Textarea 
                value={formData.summary || ""} 
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief description of the case"
                rows={3}
              />
            </div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select 
                value={formData.status || "Pending"} 
                onValueChange={(v: any) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Called">Called</SelectItem>
                  <SelectItem value="AppointmentScheduled">Appointment Scheduled</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingItem ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// OTHER CONTACTS TABLE
// ============================================================================

function OtherContactsTable() {
  const [contacts, setContacts] = useState<OtherContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<OtherContact | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCallType, setFilterCallType] = useState<string>("all")
  const [formData, setFormData] = useState<Partial<OtherContact>>({
    serialNumber: 0,
    fullName: "",
    phoneNumber: "",
    email: "",
    location: "",
    reasonForCall: "",
    callType: "Other",
    message: "",
    followUpNeeded: false,
    followUpDate: "",
    status: "New",
    notes: "",
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchOtherContacts()
      setContacts(data)
    } catch (error) {
      console.error("Error loading contacts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredContacts = contacts.filter(c => {
    const matchSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.phoneNumber.includes(searchTerm) ||
                        c.reasonForCall.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === "all" || c.status === filterStatus
    const matchCallType = filterCallType === "all" || c.callType === filterCallType
    return matchSearch && matchStatus && matchCallType
  })

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await updateOtherContact(editingItem._id, formData)
        toast({ title: "Success", description: "Contact updated successfully" })
      } else {
        await createOtherContact({ ...formData, serialNumber: contacts.length + 1 })
        toast({ title: "Success", description: "Contact added successfully" })
      }
      await loadData()
      setShowForm(false)
      setEditingItem(null)
      resetForm()
    } catch (error) {
      console.error("Error saving:", error)
      toast({ title: "Error", description: "Failed to save contact", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({
      serialNumber: 0,
      fullName: "",
      phoneNumber: "",
      email: "",
      location: "",
      reasonForCall: "",
      callType: "Other",
      message: "",
      followUpNeeded: false,
      followUpDate: "",
      status: "New",
      notes: "",
    })
  }

  const handleEdit = (item: OtherContact) => {
    setEditingItem(item)
    setFormData(item)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        await deleteOtherContact(id)
        await loadData()
        toast({ title: "Success", description: "Contact deleted successfully" })
      } catch (error) {
        console.error("Error deleting:", error)
        toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" })
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      New: "bg-blue-100 text-blue-700",
      InProgress: "bg-yellow-100 text-yellow-700",
      FollowedUp: "bg-purple-100 text-purple-700",
      Resolved: "bg-green-100 text-green-700",
      Closed: "bg-gray-100 text-gray-700",
    }
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-700"
  }

  const getCallTypeBadge = (type: string) => {
    const styles = {
      Prayer: "bg-purple-100 text-purple-700",
      Counseling: "bg-blue-100 text-blue-700",
      Information: "bg-cyan-100 text-cyan-700",
      Complaint: "bg-red-100 text-red-700",
      Suggestion: "bg-green-100 text-green-700",
      Testimony: "bg-yellow-100 text-yellow-700",
      Other: "bg-gray-100 text-gray-700",
    }
    return styles[type as keyof typeof styles] || "bg-gray-100 text-gray-700"
  }

  if (isLoading) return <Skeleton className="h-[400px] w-full" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by name, phone, or reason..." 
              className="pl-10 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="InProgress">In Progress</SelectItem>
              <SelectItem value="FollowedUp">Followed Up</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCallType} onValueChange={setFilterCallType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Prayer">Prayer</SelectItem>
              <SelectItem value="Counseling">Counseling</SelectItem>
              <SelectItem value="Information">Information</SelectItem>
              <SelectItem value="Complaint">Complaint</SelectItem>
              <SelectItem value="Suggestion">Suggestion</SelectItem>
              <SelectItem value="Testimony">Testimony</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setEditingItem(null); setShowForm(true); }} className="bg-teal-600">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Call Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Follow Up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((c) => (
                  <TableRow key={c._id} className="hover:bg-muted/50">
                    <TableCell>{c.serialNumber}</TableCell>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell>{c.phoneNumber}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.location || "—"}</TableCell>
                    <TableCell>
                      <Badge className={getCallTypeBadge(c.callType)}>
                        {c.callType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{c.reasonForCall || "—"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(c.status)}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.followUpNeeded ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "Yes"}
                        </div>
                      ) : "No"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(c._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredContacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No contacts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Contact" : "Add New Contact"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update contact information" : "Enter details for a new contact or inquiry"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Full Name *</Label>
              <Input 
                value={formData.fullName || ""} 
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input 
                value={formData.phoneNumber || ""} 
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email || ""} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input 
                value={formData.location || ""} 
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, neighborhood, or area"
              />
            </div>
            <div>
              <Label>Call Type *</Label>
              <Select 
                value={formData.callType || "Other"} 
                onValueChange={(v: any) => setFormData({ ...formData, callType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prayer">Prayer</SelectItem>
                  <SelectItem value="Counseling">Counseling</SelectItem>
                  <SelectItem value="Information">Information</SelectItem>
                  <SelectItem value="Complaint">Complaint</SelectItem>
                  <SelectItem value="Suggestion">Suggestion</SelectItem>
                  <SelectItem value="Testimony">Testimony</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status || "New"} 
                onValueChange={(v: any) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="FollowedUp">Followed Up</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Reason for Call *</Label>
              <Input 
                value={formData.reasonForCall || ""} 
                onChange={(e) => setFormData({ ...formData, reasonForCall: e.target.value })}
                placeholder="Brief reason for the call or inquiry"
              />
            </div>
            <div className="col-span-2">
              <Label>Message / Full Information</Label>
              <Textarea 
                value={formData.message || ""} 
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Detailed message, story, or information shared by the person"
                rows={4}
              />
            </div>
            <div>
              <Label>Follow Up Needed</Label>
              <Select 
                value={formData.followUpNeeded ? "true" : "false"} 
                onValueChange={(v) => setFormData({ ...formData, followUpNeeded: v === "true" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.followUpNeeded && (
              <div>
                <Label>Follow Up Date</Label>
                <Input 
                  type="date"
                  value={formData.followUpDate || ""} 
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
            )}
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes || ""} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or internal comments"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-teal-600 hover:bg-teal-700">
              {editingItem ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// STATS CARDS
// ============================================================================

function StatsCards({ guests, cases, contacts }: { 
  guests: PodcastGuest[], 
  cases: EntenfesCase[],
  contacts: OtherContact[]
}) {
  const highPriorityCases = cases.filter(c => c.priority === 'High').length
  const resolvedCases = cases.filter(c => c.status === 'Resolved').length
  const pendingContacts = contacts.filter(c => c.status === 'New' || c.status === 'InProgress').length
  const prayerRequests = contacts.filter(c => c.callType === 'Prayer').length

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Podcast Guests</p>
              <p className="text-2xl font-bold text-purple-600">{guests.length}</p>
              <p className="text-xs">Scheduled: {guests.filter(g => g.scheduledDate).length}</p>
            </div>
            <Mic className="h-8 w-8 text-purple-400" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Entenfes Cases</p>
              <p className="text-2xl font-bold text-red-600">{cases.length}</p>
              <p className="text-xs text-red-600">{highPriorityCases} high priority</p>
            </div>
            <Heart className="h-8 w-8 text-red-400" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Other Contacts</p>
              <p className="text-2xl font-bold text-teal-600">{contacts.length}</p>
              <p className="text-xs text-yellow-600">{pendingContacts} pending</p>
            </div>
            <MessageSquare className="h-8 w-8 text-teal-400" />
          </div>
        </CardContent>
      </Card>
      
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RetreatManagementPage() {
  const [activeTab, setActiveTab] = useState("podcast")
  const [guests, setGuests] = useState<PodcastGuest[]>([])
  const [cases, setCases] = useState<EntenfesCase[]>([])
  const [contacts, setContacts] = useState<OtherContact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const [gData, cData, oData] = await Promise.all([
        fetchPodcastGuests(),
        fetchEntenfesCases(),
        fetchOtherContacts(),
      ])
      setGuests(gData)
      setCases(cData)
      setContacts(oData)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const tabConfigs = [
    { id: "podcast", label: "Podcast Guests", icon: Mic, color: "purple", component: PodcastGuestsTable },
    { id: "entenfes", label: "Entenfes Cases", icon: Heart, color: "red", component: EntenfesCasesTable },
    { id: "others", label: "Other Contacts", icon: MessageSquare, color: "teal", component: OtherContactsTable },
  ]

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Retreat & Podcast Management</h2>
          <p className="text-muted-foreground">Track podcast guests, Entenfes program cases, and other contacts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards guests={guests} cases={cases} contacts={contacts} />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          {tabConfigs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className={`h-4 w-4 text-${tab.color}-500`} />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabConfigs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}