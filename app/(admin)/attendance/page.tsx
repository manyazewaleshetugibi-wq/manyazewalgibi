"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QRCodeCanvas } from "qrcode.react"
import { toast } from "react-hot-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isSameDay, addMonths, subMonths } from "date-fns"
import { Search, QrCode, CheckCircle, XCircle, RefreshCw, Printer, ChevronLeft, ChevronRight, User } from "lucide-react"
import { localDateStr } from "@/lib/attendance-date"

interface StaffUser {
  _id: string
  name: string
  email: string
  role: string
  employeeId?: string
  status: string
}

interface AttendanceRecord {
  _id: string
  userId: string
  date: string
  clockIn: string
  clockOut: string | null
  status: string
}

export default function AttendancePage() {
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  const today = localDateStr()

  const loadData = async () => {
    setIsLoading(true)
    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const [staffRes, attRes] = await Promise.all([
        fetch("/api/attendance/staff"),
        fetch(`/api/attendance?from=${monthStart}&to=${monthEnd}`),
      ])
      const staffData = await staffRes.json()
      const attData = await attRes.json()
      setStaff(staffData.data || [])
      setRecords(attData.data || [])
    } catch (error) {
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [currentMonth])

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    })
  }, [currentMonth])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const filteredStaff = staff.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getRecordsForUserAndDay = (userId: string, day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return records.filter(r => r.userId === userId && r.date === dateStr)
  }

  const getDayStatus = (userId: string, day: Date) => {
    const dayRecords = getRecordsForUserAndDay(userId, day)
    if (dayRecords.length === 0) return null
    const hasClockIn = dayRecords.some(r => r.clockIn)
    const hasClockOut = dayRecords.some(r => r.clockOut)
    if (hasClockIn && hasClockOut) return 'completed'
    if (hasClockIn) return 'active'
    return null
  }

  const roles = useMemo(() => Array.from(new Set(staff.map(u => u.role))).sort(), [staff])

  const clockInUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/attendance/clock`

  const getMonthSummary = (userId: string) => {
    let present = 0
    let absent = 0
    daysInMonth.forEach(day => {
      if (getDay(day) === 0) return
      const status = getDayStatus(userId, day)
      if (status === 'completed' || status === 'active') present++
      else absent++
    })
    return { present, absent, total: present + absent }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 p-6">
        <div className="max-w-full mx-auto space-y-6">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-[600px] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 p-3 md:p-6">
      <div className="max-w-full mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent">
              Attendance Dashboard
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">{format(currentMonth, 'MMMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadData} variant="outline" size="sm" className="rounded-full">
              <RefreshCw className="h-4 w-4 mr-2" />Refresh
            </Button>
          </div>
        </div>

        {/* QR Code Card */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white p-3 rounded-xl border shadow-sm">
              <QRCodeCanvas value={clockInUrl} size={160} level="L" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5 text-purple-600" /> Scan to Clock In
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                One QR code for all staff. Scan with phone → fingerprint → location check → clock in/out.
              </p>
              <div className="flex gap-2 mt-3 justify-center md:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => { navigator.clipboard.writeText(clockInUrl); toast.success("Link copied") }}
                >
                  Copy Link
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" /> Print QR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Staff", value: staff.length, color: "purple", bg: "from-white to-purple-50/50", text: "text-purple-600" },
            { label: "Today Clocked In", value: records.filter(r => r.date === today && r.clockIn && !r.clockOut).length, color: "green", bg: "from-white to-green-50/50", text: "text-green-600" },
            { label: "Today Completed", value: records.filter(r => r.date === today && r.clockIn && r.clockOut).length, color: "blue", bg: "from-white to-blue-50/50", text: "text-blue-600" },
            { label: "Today Absent", value: staff.filter(u => !records.find(r => r.userId === u._id && r.date === today)).length, color: "red", bg: "from-white to-red-50/50", text: "text-red-600" },
          ].map((stat, i) => (
            <Card key={i} className={`rounded-2xl border-0 shadow-lg bg-gradient-to-br ${stat.bg}`}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardHeader className="p-4 pb-0">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="rounded-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-sm min-w-[140px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
                  <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px] rounded-xl">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white z-10 text-left p-2 border-b min-w-[160px]">
                      <span className="font-semibold">Staff</span>
                    </th>
                    <th className="p-2 border-b text-center font-semibold" colSpan={3}>Summary</th>
                    {daysInMonth.map((day, i) => (
                      <th
                        key={i}
                        className={`p-1 border-b text-center min-w-[28px] ${
                          getDay(day) === 0 ? 'bg-red-50' : ''
                        } ${format(day, 'yyyy-MM-dd') === today ? 'bg-purple-50' : ''}`}
                      >
                        <div className="text-[10px] text-muted-foreground">{dayNames[getDay(day)]}</div>
                        <div className="font-semibold text-xs">{format(day, 'd')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((user) => {
                    const summary = getMonthSummary(user._id)
                    return (
                      <tr key={user._id} className="hover:bg-purple-50/50">
                        <td className="sticky left-0 bg-white z-10 p-2 border-b">
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-[10px] text-muted-foreground capitalize">{user.role}{user.employeeId ? ` · ${user.employeeId}` : ''}</div>
                        </td>
                        <td className="p-2 border-b text-center">
                          <span className="text-green-600 font-medium">{summary.present}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-red-600 font-medium">{summary.absent}</span>
                        </td>
                        <td className="p-2 border-b text-center">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-500 h-1.5 rounded-full"
                              style={{ width: `${summary.total > 0 ? (summary.present / summary.total) * 100 : 0}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-2 border-b text-center text-[10px]">
                          {summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0}%
                        </td>
                        {daysInMonth.map((day, i) => {
                          const status = getDayStatus(user._id, day)
                          const isToday = format(day, 'yyyy-MM-dd') === today
                          const isSunday = getDay(day) === 0
                          return (
                            <td
                              key={i}
                              className={`p-1 border-b text-center ${
                                isSunday ? 'bg-gray-50' : ''
                              } ${isToday ? 'bg-purple-50' : ''}`}
                            >
                              {isSunday ? (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              ) : status === 'completed' ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-600 mx-auto" />
                              ) : status === 'active' ? (
                                <div className="h-3.5 w-3.5 rounded-full bg-yellow-400 mx-auto" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-400 mx-auto" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={daysInMonth.length + 4} className="text-center py-10 text-muted-foreground">
                        No staff found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
