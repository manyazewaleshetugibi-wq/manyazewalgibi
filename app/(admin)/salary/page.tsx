"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DollarSign, Plus, CheckCircle, Trash2, Banknote, ChevronDown, ChevronUp, Loader2, Download, Calendar, Search, X, Pencil
} from "lucide-react"

interface Staff { _id: string; name: string; email: string; role: string }
interface Payment { month: number; year: number; amount: number; paidAt: string; status: string; notes: string }
interface AttendanceInfo { present: number; absent: number; late: number; days: number }
interface Salary {
  _id: string; userId: string; name: string; email: string; role: string; position?: string
  baseSalary: number; bankAccount: string; notes: string; status: string
  history: Payment[]; paidThisMonth?: boolean; paymentThisMonth?: Payment
}

function ccy(n: number) { return 'ETB ' + n.toLocaleString('en', { minimumFractionDigits: 2 }) }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function isWeekday(d: Date) { const w = d.getDay(); return w !== 0 }

function getWorkingDays(month: number, year: number) {
  let count = 0
  const days = new Date(year, month, 0).getDate()
  for (let d = 1; d <= days; d++) if (isWeekday(new Date(year, month - 1, d))) count++
  return count
}

export default function SalaryPage() {
  const { data: session } = useSession()
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceInfo>>({})
  const [loading, setLoading] = useState(true)
  const [staffLoading, setStaffLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<{salary: Salary | null; open: boolean}>({ salary: null, open: false })
  const [registerMode, setRegisterMode] = useState<'existing' | 'new'>('existing')
  const [showPay, setShowPay] = useState<{salary: Salary; open: boolean}>({ salary: null as any, open: false })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const [staffSearch, setStaffSearch] = useState("")
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)
  const staffRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [viewYear, setViewYear] = useState(now.getFullYear())

  const [form, setForm] = useState({ userId: '', name: '', phone: '', baseSalary: '', bankAccount: '', notes: '', position: '' })
  const [editForm, setEditForm] = useState({ position: '', baseSalary: '', bankAccount: '', notes: '' })
  const [payForm, setPayForm] = useState({ amount: '', notes: '' })
  const tableRef = useRef<HTMLTableElement>(null)

  const workingDays = useMemo(() => getWorkingDays(viewMonth, viewYear), [viewMonth, viewYear])

  const loadSalaries = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/salary?month=${viewMonth}&year=${viewYear}`)
      const d = await r.json()
      if (d.success) setSalaries(d.data)
    } catch {} finally { setLoading(false) }
  }, [viewMonth, viewYear])

  const loadAttendance = useCallback(async () => {
    const monthStart = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`
    const monthEnd = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${new Date(viewYear, viewMonth, 0).getDate()}`
    try {
      const r = await fetch(`/api/attendance?from=${monthStart}&to=${monthEnd}`)
      const d = await r.json()
      if (!d.success) return
      const map: Record<string, AttendanceInfo> = {}
      const seen = new Set<string>()
      for (const rec of (d.data || [])) {
        const key = `${rec.userId}|${rec.date}`
        if (seen.has(key)) continue
        seen.add(key)
        if (!map[rec.userId]) map[rec.userId] = { present: 0, absent: 0, late: 0, days: 0 }
        const info = map[rec.userId]
        info.days++
        if (rec.clockIn) {
          info.present++
          if (rec.status === 'late' || (rec.lateMinutes && rec.lateMinutes > 0)) info.late++
        }
      }
      setAttendanceMap(map)
    } catch {}
  }, [viewMonth, viewYear])

  const loadStaff = useCallback(async () => {
    if (staffList.length > 0) return
    setStaffLoading(true)
    try {
      const r = await fetch('/api/staff')
      const d = await r.json()
      if (d.success) setStaffList((d.data || []).filter((s: any) => s.status === 'active'))
    } finally { setStaffLoading(false) }
  }, [staffList.length])

  useEffect(() => { loadSalaries(); loadAttendance() }, [loadSalaries, loadAttendance])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (staffRef.current && !staffRef.current.contains(e.target as Node)) setShowStaffDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const auditMeta = useMemo(() => ({
    _userId: user?.id || '', _userName: user?.name || '', _userRole: user?.role || '',
  }), [user])

  const handleAdd = async () => {
    if (!form.baseSalary) return
    if (registerMode === 'existing' && !form.userId) return
    if (registerMode === 'new' && !form.name.trim()) return
    setSubmitting(true)
    try {
      const payload: any = { baseSalary: form.baseSalary, bankAccount: form.bankAccount, notes: form.notes, position: form.position, ...auditMeta }
      if (registerMode === 'new') {
        payload.newStaff = { name: form.name, position: form.position, phone: form.phone }
      } else {
        payload.userId = form.userId
      }
      const r = await fetch('/api/salary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      const d = await r.json()
      if (d.success) { setShowAdd(false); setForm({ userId: '', name: '', phone: '', baseSalary: '', bankAccount: '', notes: '', position: '' }); setStaffSearch(""); loadSalaries() }
      else alert(d.error)
    } catch { alert('Failed') } finally { setSubmitting(false) }
  }

  const openEdit = (sal: Salary) => {
    setEditForm({ position: sal.position || sal.role || '', baseSalary: String(sal.baseSalary), bankAccount: sal.bankAccount || '', notes: sal.notes || '' })
    setShowEdit({ salary: sal, open: true })
  }

  const handleEdit = async () => {
    if (!showEdit.salary || !editForm.baseSalary) return
    setSubmitting(true)
    try {
      const r = await fetch(`/api/salary?id=${showEdit.salary._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: editForm.position, baseSalary: editForm.baseSalary, bankAccount: editForm.bankAccount, notes: editForm.notes, ...auditMeta })
      })
      const d = await r.json()
      if (d.success) { setShowEdit({ salary: null, open: false }); loadSalaries() }
      else alert(d.error)
    } catch { alert('Failed') } finally { setSubmitting(false) }
  }

  const handlePay = async () => {
    if (!showPay.salary) return
    setSubmitting(true)
    try {
      const r = await fetch('/api/salary/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaryId: showPay.salary._id, month: viewMonth, year: viewYear, amount: payForm.amount, notes: payForm.notes, ...auditMeta })
      })
      const d = await r.json()
      if (d.success) { setShowPay({ salary: null as any, open: false }); setPayForm({ amount: '', notes: '' }); loadSalaries() }
      else alert(d.error)
    } catch { alert('Failed') } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    try { await fetch(`/api/salary?id=${id}`, { method: 'DELETE' }); loadSalaries() } catch {}
  }

  const toggleExpand = (id: string) => {
    const s = new Set(expandedRows); s.has(id) ? s.delete(id) : s.add(id); setExpandedRows(s)
  }

  function calcSuggestedPay(sal: Salary): { amount: number; present: number; absent: number; dailyRate: number } {
    const att = attendanceMap[sal.userId]
    const present = att?.present || 0
    const absent = workingDays - present
    const dailyRate = sal.baseSalary / workingDays
    return { amount: Math.round(dailyRate * present), present, absent, dailyRate: Math.round(dailyRate) }
  }

  const stats = useMemo(() => {
    const total = salaries.reduce((s, x) => s + x.baseSalary, 0)
    const paid = salaries.filter(s => s.paidThisMonth)
    const unpaid = salaries.filter(s => !s.paidThisMonth)
    const paidAmount = paid.reduce((s, x) => s + (x.paymentThisMonth?.amount || x.baseSalary || 0), 0)
    const suggestedTotal = salaries.reduce((s, x) => s + calcSuggestedPay(x).amount, 0)
    return { total, paid: paid.length, unpaid: unpaid.length, paidAmount, count: salaries.length, suggestedTotal }
  }, [salaries, attendanceMap, workingDays])

  const unregisteredStaff = useMemo(
    () => staffList.filter(s => !salaries.find(sal => sal.userId === s._id)),
    [staffList, salaries]
  )

  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return unregisteredStaff
    const q = staffSearch.toLowerCase()
    return unregisteredStaff.filter(s =>
      s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    )
  }, [unregisteredStaff, staffSearch])

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const data = salaries.map(s => {
      const sug = calcSuggestedPay(s)
      return {
        Name: s.name,
        Position: s.position || s.role,
        'Base Salary': s.baseSalary,
        'Daily Rate': sug.dailyRate,
        'Days Worked': sug.present,
        'Days Absent': sug.absent,
        [`${MONTHS[viewMonth - 1]} ${viewYear}`]: s.paidThisMonth ? `Paid ${ccy(s.paymentThisMonth?.amount || s.baseSalary)}` : 'Unpaid',
        'Bank Account': s.bankAccount || '-',
        Notes: s.notes || '-',
      }
    })
    data.push({ Name: 'TOTAL', Position: '', 'Base Salary': stats.total, 'Daily Rate': '', 'Days Worked': '', 'Days Absent': '', [`${MONTHS[viewMonth - 1]} ${viewYear}`]: `${stats.paid} paid / ${stats.unpaid} unpaid`, 'Bank Account': '', Notes: '' })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Salary')
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }]
    XLSX.writeFile(wb, `Salary_${MONTHS[viewMonth - 1]}_${viewYear}.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-2 sm:p-8 pt-3 sm:pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" /> Salary Management
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {MONTHS[viewMonth - 1]} {viewYear} — {workingDays} working days — {stats.paid} paid, {stats.unpaid} unpaid
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Calendar className="h-4 w-4 text-muted-foreground ml-1" />
            <select value={viewMonth} onChange={e => setViewMonth(parseInt(e.target.value))} className="bg-transparent text-sm outline-none cursor-pointer">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={viewYear} onChange={e => setViewYear(parseInt(e.target.value))} className="bg-transparent text-sm outline-none cursor-pointer">
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={exportExcel} className="rounded-full text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
          <Button onClick={() => { loadStaff(); setShowAdd(true) }} size="sm" className="bg-green-700 hover:bg-green-600 rounded-full text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" /> Register
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <Card className="rounded-xl border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Total Payroll</p>
            <p className="text-lg sm:text-2xl font-bold text-green-700">{ccy(stats.total)}</p>
            <p className="text-xs text-muted-foreground">{stats.count} staff</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Suggested Pay</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-700">{ccy(stats.suggestedTotal)}</p>
            <p className="text-xs text-muted-foreground">based on attendance</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Paid This Month</p>
            <p className="text-lg sm:text-2xl font-bold text-amber-700">{ccy(stats.paidAmount)}</p>
            <p className="text-xs text-muted-foreground">{stats.paid} staff</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Unpaid</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.unpaid}</p>
            <p className="text-xs text-muted-foreground">staff</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-700">{ccy(stats.total - stats.paidAmount)}</p>
            <p className="text-xs text-muted-foreground">to pay</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-0 shadow-md">
        <CardContent className="p-0 overflow-x-auto">
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-right">Suggested</TableHead>
                <TableHead className="text-center">{MONTHS[viewMonth - 1]}</TableHead>
                <TableHead className="text-center"></TableHead>
                <TableHead className="text-center">Hist</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaries.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No salaries for {MONTHS[viewMonth - 1]} {viewYear}. Click Register to add one.
                </TableCell></TableRow>
              )}
              {salaries.map(sal => {
                const sug = calcSuggestedPay(sal)
                const att = attendanceMap[sal.userId]
                return (
                  <TableRow key={sal._id} className={sal.paidThisMonth ? 'bg-green-50/30' : ''}>
                    <TableCell>
                      <div className="font-medium text-sm">{sal.name}</div>
                      {sal.email && <div className="text-[10px] text-muted-foreground">{sal.email}</div>}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{sal.position || sal.role}</Badge></TableCell>
                    <TableCell className="text-right font-bold text-sm">{ccy(sal.baseSalary)}</TableCell>
                    <TableCell className="text-center">
                      {att ? (
                        <span className="text-green-600 font-medium text-sm">{sug.present}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {att ? (
                        <span className={sug.absent > 0 ? 'text-red-500 font-medium text-sm' : 'text-xs text-muted-foreground'}>
                          {sug.absent}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium text-blue-700">{ccy(sug.amount)}</div>
                      <div className="text-[10px] text-muted-foreground">{sug.dailyRate}/day</div>
                    </TableCell>
                    <TableCell className="text-center">
                      {sal.paidThisMonth ? (
                        <Badge className="bg-green-100 text-green-800 border-0 text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-full text-xs h-7"
                          onClick={() => {
                            const suggestAmount = sug.amount || sal.baseSalary
                            setShowPay({ salary: sal, open: true })
                            setPayForm({ amount: String(suggestAmount), notes: '' })
                          }}>
                          <Banknote className="h-3 w-3 mr-1" /> Pay
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => openEdit(sal)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(sal._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => toggleExpand(sal._id)} className="h-7 rounded-full">
                        {expandedRows.has(sal._id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setForm({ userId: '', name: '', phone: '', baseSalary: '', bankAccount: '', notes: '', position: '' }); setStaffSearch("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Salary</DialogTitle>
            <DialogDescription>Select an existing staff member or register a new one and set the monthly salary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1 bg-muted rounded-lg p-1">
              <button type="button" onClick={() => { setRegisterMode('existing'); setForm(f => ({ ...f, userId: '', name: '' })) }}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${registerMode === 'existing' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Search className="h-3.5 w-3.5" /> Select Existing
              </button>
              <button type="button" onClick={() => { setRegisterMode('new'); setForm(f => ({ ...f, userId: '', name: f.name || '' })) }}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${registerMode === 'new' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Plus className="h-3.5 w-3.5" /> Register New
              </button>
            </div>

            {registerMode === 'existing' ? (
              <div ref={staffRef}>
                <label className="text-xs font-medium">Staff Member</label>
                {staffLoading ? (
                  <Skeleton className="h-10 w-full rounded-lg" />
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Type name to search or click to select..."
                        value={staffSearch}
                        onChange={e => { setStaffSearch(e.target.value); setShowStaffDropdown(true) }}
                        onFocus={() => setShowStaffDropdown(true)}
                        className="pl-9 pr-8 rounded-xl"
                      />
                      {staffSearch && (
                        <button onClick={() => { setStaffSearch(""); setForm(f => ({ ...f, userId: '' })) }} className="absolute right-3 top-1/2 -translate-y-1/2">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {showStaffDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {filteredStaff.map(s => (
                          <div
                            key={s._id}
                            className={`px-3 py-2.5 hover:bg-purple-50 cursor-pointer border-b last:border-0 ${form.userId === s._id ? 'bg-purple-50' : ''}`}
                            onClick={() => {
                              setForm(f => ({ ...f, userId: s._id, position: f.position || s.role }))
                              setStaffSearch(s.name)
                              setShowStaffDropdown(false)
                            }}
                          >
                            <div className="font-medium text-sm">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.role} — {s.email}</div>
                          </div>
                        ))}
                        {filteredStaff.length === 0 && (
                          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                            No matching staff found. Switch to &quot;Register New&quot; to create one.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {form.userId && !showStaffDropdown && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" /> Selected: {staffSearch}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium">Full Name <span className="text-red-500">*</span></label>
                  <Input placeholder="e.g. Abebe Kebede" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-medium">Phone</label>
                  <Input placeholder="Optional" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium">Position / Title</label>
              <Input placeholder="e.g. Chef, Waitress, Cleaner" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium">Monthly Salary (ETB)</label>
              <Input type="number" placeholder="e.g. 15000" value={form.baseSalary} onChange={e => setForm(f => ({ ...f, baseSalary: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium">Bank Account</label>
              <Input placeholder="Optional" value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <Input placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setForm({ userId: '', name: '', phone: '', baseSalary: '', bankAccount: '', notes: '', position: '' }); setStaffSearch("") }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting || !form.baseSalary || (registerMode === 'existing' ? !form.userId : !form.name.trim())} className="bg-green-700 hover:bg-green-600">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit.open} onOpenChange={v => setShowEdit(s => ({ ...s, open: v }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Salary</DialogTitle>
            <DialogDescription>{showEdit.salary?.name} — update salary details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Position / Title</label>
              <Input placeholder="e.g. Chef, Waitress, Cleaner" value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium">Monthly Salary (ETB)</label>
              <Input type="number" value={editForm.baseSalary} onChange={e => setEditForm(f => ({ ...f, baseSalary: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium">Bank Account</label>
              <Input placeholder="Optional" value={editForm.bankAccount} onChange={e => setEditForm(f => ({ ...f, bankAccount: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <Input placeholder="Optional" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEdit(s => ({ ...s, open: false }))}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting || !editForm.baseSalary} className="bg-green-700 hover:bg-green-600">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPay.open} onOpenChange={v => setShowPay(s => ({ ...s, open: v }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Salary</DialogTitle>
            <DialogDescription>
              {showPay.salary?.name} — {MONTHS[viewMonth - 1]} {viewYear}
              {showPay.salary && (() => {
                const sug = calcSuggestedPay(showPay.salary)
                return sug.amount !== showPay.salary.baseSalary ? ` (${sug.present} days worked → ${ccy(sug.amount)})` : ''
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {showPay.salary && (() => {
              const sug = calcSuggestedPay(showPay.salary)
              return (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="font-semibold text-blue-700">{sug.dailyRate}</div>
                    <div className="text-muted-foreground">Daily</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="font-semibold text-green-700">{sug.present}</div>
                    <div className="text-muted-foreground">Present</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <div className="font-semibold text-red-600">{sug.absent}</div>
                    <div className="text-muted-foreground">Absent</div>
                  </div>
                </div>
              )
            })()}
            <div>
              <label className="text-xs font-medium">Amount (ETB)</label>
              <Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <Input placeholder="Receipt, method..." value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPay(s => ({ ...s, open: false }))}>Cancel</Button>
            <Button onClick={handlePay} disabled={submitting || !payForm.amount} className="bg-green-700 hover:bg-green-600">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
