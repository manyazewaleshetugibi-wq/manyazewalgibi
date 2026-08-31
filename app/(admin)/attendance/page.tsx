"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { QRCodeCanvas } from "qrcode.react"
import { toast } from "react-hot-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, addMonths, subMonths } from "date-fns"
import { Search, QrCode, CheckCircle, XCircle, RefreshCw, Printer, ChevronLeft, ChevronRight, Eye, Clock, Timer, CalendarX, CalendarCheck2, TrendingUp } from "lucide-react"
import { localDateStr } from "@/lib/attendance-date"

interface StaffUser {
  _id: string
  name: string
  email: string
  role: string
  employeeId?: string
  department?: string
  shift?: string
  status: string
}

interface AttendanceRecord {
  _id: string
  userId: string
  date: string
  clockIn: string
  clockOut: string | null
  status: string
  shift?: string
  lateMinutes?: number
  overtimeMinutes?: number
  note?: string
}

export default function AttendancePage() {
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [detailUser, setDetailUser] = useState<StaffUser | null>(null)

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

  const getMonthLateCount = (userId: string) => {
    return records.filter(r => r.userId === userId && (r.lateMinutes || 0) > 0).length
  }

  const getPercent = (summary: { present: number; total: number }) => {
    return summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0
  }

  const formatTime = (iso?: string | null) => {
    if (!iso) return "—"
    try {
      let date: Date | null = null
      try { date = parseISO(iso) } catch { date = null }
      if (!date || isNaN(date.getTime())) date = new Date(iso)
      if (isNaN(date.getTime())) return "—"
      return format(date, 'hh:mm a')
    } catch {
      return "—"
    }
  }

  const getWorkedMinutes = (rec?: AttendanceRecord) => {
    if (!rec?.clockIn || !rec?.clockOut) return null
    const inTime = new Date(rec.clockIn).getTime()
    const outTime = new Date(rec.clockOut).getTime()
    if (isNaN(inTime) || isNaN(outTime) || outTime <= inTime) return null
    return Math.round((outTime - inTime) / 60000)
  }

  const formatMinutes = (mins?: number | null) => {
    if (mins == null) return "—"
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h === 0 ? `${m}m` : `${h}h ${m}m`
  }

  const shiftBadgeClass = (shift?: string) => {
    const s = (shift || '').toLowerCase()
    const map: Record<string, string> = {
      morning: 'bg-amber-100 text-amber-700',
      afternoon: 'bg-blue-100 text-blue-700',
      evening: 'bg-purple-100 text-purple-700',
    }
    return `inline-block px-2 py-0.5 rounded-full font-medium capitalize ${map[s] || 'bg-gray-100 text-gray-700'}`
  }

  const detailRecords = useMemo(() => {
    if (!detailUser) return []
    return records
      .filter(r => r.userId === detailUser._id)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [detailUser, records])

  const detailSummary = useMemo(() => {
    if (!detailUser) return { present: 0, absent: 0, total: 0, late: 0, percent: 0, workedMinutes: 0, overtimeMinutes: 0 }
    const summary = getMonthSummary(detailUser._id)
    let workedMinutes = 0
    let overtimeMinutes = 0
    detailRecords.forEach(r => {
      const wm = getWorkedMinutes(r)
      if (wm != null) workedMinutes += wm
      overtimeMinutes += r.overtimeMinutes || 0
    })
    return {
      ...summary,
      late: getMonthLateCount(detailUser._id),
      percent: getPercent(summary),
      workedMinutes,
      overtimeMinutes,
    }
  }, [detailUser, records, daysInMonth, detailRecords])

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
                          {(() => {
                            const pct = getPercent(summary)
                            const color = pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            return <span className={`inline-block px-2 py-1 rounded-full font-bold ${color}`}>{pct}%</span>
                          })()}
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
                        <td className="p-2 border-b text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full text-[11px]"
                            onClick={() => setDetailUser(user)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> Details
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={daysInMonth.length + 5} className="text-center py-10 text-muted-foreground">
                        No staff found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Staff Detail Dialog */}
        <Dialog open={!!detailUser} onOpenChange={(open) => { if (!open) setDetailUser(null) }}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(detailUser?.name || "?").split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate">{detailUser?.name}</span>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 capitalize">{detailUser?.role || "Staff"}</Badge>
                  </div>
                  <DialogDescription className="mt-1">
                    {detailUser?.department && <span className="capitalize">{detailUser.department}</span>}
                    {detailUser?.employeeId && <span> · {detailUser.employeeId}</span>}
                    {detailUser?.shift && <span className="capitalize"> · {detailUser.shift.toLowerCase()} shift</span>}
                    <span> · {format(currentMonth, 'MMMM yyyy')}</span>
                  </DialogDescription>
                </div>
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 min-h-0 mt-2 rounded-xl border">
              <div className="p-2 sm:p-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <Card className="rounded-xl">
                <CardContent className="p-3 flex flex-col items-center gap-1">
                  <CalendarCheck2 className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-bold">{detailSummary.present}</span>
                  <span className="text-[10px] text-muted-foreground">Present Days</span>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-3 flex flex-col items-center gap-1">
                  <CalendarX className="h-4 w-4 text-red-600" />
                  <span className="text-lg font-bold">{detailSummary.absent}</span>
                  <span className="text-[10px] text-muted-foreground">Absent Days</span>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-3 flex flex-col items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-lg font-bold">{detailSummary.late}</span>
                  <span className="text-[10px] text-muted-foreground">Late Arrivals</span>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-3 flex flex-col items-center gap-1">
                  <Timer className="h-4 w-4 text-blue-600" />
                  <span className="text-lg font-bold">{formatMinutes(detailSummary.workedMinutes)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {detailSummary.overtimeMinutes > 0 ? `Worked · +${formatMinutes(detailSummary.overtimeMinutes)} OT` : "Total Worked"}
                  </span>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="p-3 flex flex-col items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-lg font-bold">{detailSummary.percent}%</span>
                  <span className="text-[10px] text-muted-foreground">Performance</span>
                </CardContent>
              </Card>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${detailSummary.percent >= 80 ? 'bg-green-500' : detailSummary.percent >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${detailSummary.percent}%` }}
              />
            </div>

            <table className="w-full text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b bg-gray-50/80">
                    <th className="p-2 text-left font-semibold">Date</th>
                    <th className="p-2 text-center font-semibold">Clock In</th>
                    <th className="p-2 text-center font-semibold">Clock Out</th>
                    <th className="p-2 text-center font-semibold">Worked</th>
                    <th className="p-2 text-center font-semibold">Shift</th>
                    <th className="p-2 text-center font-semibold">Late</th>
                    <th className="p-2 text-center font-semibold">Status</th>
                    <th className="p-2 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {detailUser && daysInMonth.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const dayRecords = detailRecords.filter(r => r.date === dateStr)
                    const rec = dayRecords[0]
                    const isSunday = getDay(day) === 0
                    const isToday = dateStr === today
                    const status = getDayStatus(detailUser._id, day)
                    const workedMinutes = getWorkedMinutes(rec)
                    const isLate = (rec?.lateMinutes || 0) > 0
                    return (
                      <tr key={i} className={`border-b ${isSunday ? 'bg-gray-50' : ''} ${isToday ? 'bg-purple-50' : ''}`}>
                        <td className="p-2">
                          <div className="font-medium">{format(day, 'EEE, MMM d')}</div>
                          {isSunday
                            ? <span className="text-[10px] text-muted-foreground">Rest day</span>
                            : isToday
                              ? <span className="text-[10px] text-purple-600 font-medium">Today</span>
                              : <span className="text-[10px] text-muted-foreground">{format(day, 'yyyy')}</span>}
                        </td>
                        <td className="p-2 text-center">
                          {isSunday ? "—" : formatTime(rec?.clockIn)}
                        </td>
                        <td className="p-2 text-center">
                          {isSunday ? "—" : formatTime(rec?.clockOut)}
                        </td>
                        <td className="p-2 text-center">{formatMinutes(workedMinutes)}</td>
                        <td className="p-2 text-center">
                          {rec?.shift
                            ? <span className={shiftBadgeClass(rec.shift)}>{rec.shift.toLowerCase()}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-2 text-center">
                          {isLate
                            ? <span className="text-red-600 font-medium">{Math.round(rec!.lateMinutes!)}m</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-2 text-center">
                          {isSunday ? (
                            <Badge variant="outline" className="text-[10px]">Rest</Badge>
                          ) : status === 'completed' ? (
                            isLate ? (
                              <Badge className="bg-orange-400 text-white text-[10px]">Late</Badge>
                            ) : (
                              <Badge className="bg-green-500 text-[10px]">Present</Badge>
                            )
                          ) : status === 'active' ? (
                            <Badge className="bg-yellow-400 text-yellow-900 text-[10px]">Active</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Absent</Badge>
                          )}
                        </td>
                        <td className="p-2 text-left max-w-[180px] truncate text-muted-foreground">
                          {rec?.note ? rec.note : <span className="text-muted-foreground/60">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
