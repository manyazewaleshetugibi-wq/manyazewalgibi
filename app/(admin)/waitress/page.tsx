"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Toaster, toast } from "react-hot-toast"
import { Loader2, Plus, Search, Edit, Trash, User, Phone, Clock, CheckCircle, XCircle } from "lucide-react"

// Interfaces
interface Waitress {
  _id: string
  name: string
  phone: string
  shift: Shift
  isActive: boolean
  createdAt: string
  updatedAt: string
}

enum Shift {
  MORNING = "Morning",
  EVENING = "Evening",
  FULL_DAY = "Full Day",
}

// Server Actions
async function fetchWaitresses(): Promise<Waitress[]> {
  const res = await fetch("/api/waitress")
  if (!res.ok) throw new Error("Failed to fetch waitresses")
  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? data.waitresses ?? [])
}

async function addWaitress(waitress: Omit<Waitress, "_id" | "createdAt" | "updatedAt">): Promise<Waitress> {
  const res = await fetch("/api/waitress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(waitress),
  })
  if (!res.ok) throw new Error("Failed to add waitress")
  return res.json()
}

async function updateWaitress(id: string, waitress: Partial<Waitress>): Promise<Waitress> {
  const res = await fetch(`/api/waitress/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(waitress),
  })
  if (!res.ok) throw new Error("Failed to update waitress")
  return res.json()
}

async function deleteWaitress(id: string): Promise<void> {
  const res = await fetch(`/api/waitress/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete waitress")
}

// Main Component
export default function WaitressManagement() {
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [shiftFilter, setShiftFilter] = useState<Shift | "All">("All")
  const [activeFilter, setActiveFilter] = useState<boolean | "All">("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWaitress, setEditingWaitress] = useState<Waitress | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadWaitresses()
  }, [])

  async function loadWaitresses() {
    setLoading(true)
    try {
      const data = await fetchWaitresses()
      setWaitresses(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error("Failed to load waitresses")
    } finally {
      setLoading(false)
    }
  }

  const filteredWaitresses = waitresses
    .filter((w) => w && w.name)
    .filter(
      (w) =>
        w.name.toLowerCase().includes(search.toLowerCase()) &&
        (shiftFilter === "All" || w.shift === shiftFilter) &&
        (activeFilter === "All" || w.isActive === activeFilter),
    )

  async function handleAddWaitress(waitress: Omit<Waitress, "_id" | "createdAt" | "updatedAt">) {
    try {
      const newWaitress = await addWaitress(waitress)
      setWaitresses([...waitresses, newWaitress])
      toast.success("Waitress added successfully")
      setIsDialogOpen(false)
    } catch (error) {
      toast.error("Failed to add waitress")
    }
  }

  async function handleUpdateWaitress(id: string, updatedWaitress: Partial<Waitress>) {
    try {
      const updated = await updateWaitress(id, updatedWaitress)
      setWaitresses(waitresses.map((w) => (w._id === id ? updated : w)))
      toast.success("Waitress updated successfully")
      setIsDialogOpen(false)
      setEditingWaitress(null)
    } catch (error) {
      toast.error("Failed to update waitress")
    }
  }

  async function handleDeleteWaitress(id: string) {
    try {
      await deleteWaitress(id)
      setWaitresses(waitresses.filter((w) => w._id !== id))
      toast.success("Waitress deleted successfully")
    } catch (error) {
      toast.error("Failed to delete waitress")
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <h1 className="text-4xl font-bold mb-8 text-center text-primary">Waitress Management</h1>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Input
              placeholder="Search waitresses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <Select value={shiftFilter} onValueChange={(value) => setShiftFilter(value as Shift | "All")}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Filter by shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Shifts</SelectItem>
              <SelectItem value={Shift.MORNING}>{Shift.MORNING}</SelectItem>
              <SelectItem value={Shift.EVENING}>{Shift.EVENING}</SelectItem>
              <SelectItem value={Shift.FULL_DAY}>{Shift.FULL_DAY}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={activeFilter === "All" ? "All" : activeFilter.toString()}
            onValueChange={(value) => setActiveFilter(value === "All" ? "All" : value === "true")}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Waitress
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWaitress ? "Edit Waitress" : "Add New Waitress"}</DialogTitle>
            </DialogHeader>
            <WaitressForm
              onSubmit={editingWaitress ? (data) => handleUpdateWaitress(editingWaitress._id, data) : handleAddWaitress}
              initialData={editingWaitress ?? undefined}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWaitresses.map((waitress) => (
                <TableRow key={waitress._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-gray-400" />
                      {waitress.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4 text-gray-400" />
                      {waitress.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-gray-400" />
                      {waitress.shift}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {waitress.isActive ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      )}
                      {waitress.isActive ? "Active" : "Inactive"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingWaitress(waitress)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteWaitress(waitress._id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// Waitress Form Component
function WaitressForm({
  onSubmit,
  initialData,
}: {
  onSubmit: (data: Omit<Waitress, "_id" | "createdAt" | "updatedAt">) => void
  initialData?: Waitress
}) {
  const [name, setName] = useState(initialData?.name || "")
  const [phone, setPhone] = useState(initialData?.phone || "")
  const [shift, setShift] = useState<Shift>(initialData?.shift || Shift.MORNING)
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, phone, shift, isActive })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <div className="relative">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="pl-10" />
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <div className="relative">
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required className="pl-10" />
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      <div>
        <Label htmlFor="shift">Shift</Label>
        <Select value={shift} onValueChange={(value) => setShift(value as Shift)}>
          <SelectTrigger>
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={Shift.MORNING}>{Shift.MORNING}</SelectItem>
            <SelectItem value={Shift.EVENING}>{Shift.EVENING}</SelectItem>
            <SelectItem value={Shift.FULL_DAY}>{Shift.FULL_DAY}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <Button type="submit" className="w-full">
        Submit
      </Button>
    </form>
  )
}

