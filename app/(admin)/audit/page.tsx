"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  History, Search, ChevronLeft, ChevronRight, RefreshCw, Shield
} from "lucide-react"

interface AuditEntry {
  _id: string
  action: string
  entity: string
  entityId?: string
  userId?: string
  userName?: string
  userRole?: string
  description: string
  changes?: Record<string, { from: any; to: any }>
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  PAY: 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-sky-100 text-sky-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  EXPORT: 'bg-orange-100 text-orange-800',
  APPROVE: 'bg-teal-100 text-teal-800',
  REJECT: 'bg-rose-100 text-rose-800',
  CANCEL: 'bg-yellow-100 text-yellow-800',
}

const ENTITIES = ['salary', 'user', 'order', 'expense', 'attendance', 'inventory', 'menu']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'PAY', 'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REJECT', 'CANCEL']

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-ET', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadLogs = async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '30' })
      if (entity) params.set('entity', entity)
      if (action) params.set('action', action)
      if (search) params.set('search', search)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const r = await fetch(`/api/audit?${params}`)
      const d = await r.json()
      if (d.success) {
        setLogs(d.data)
        setTotal(d.total)
        setPage(d.page)
        setPages(d.pages)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadLogs(1) }, [])

  const handleFilter = () => { setExpanded(null); loadLogs(1) }
  const handleReset = () => {
    setEntity(''); setAction(''); setSearch(''); setFrom(''); setTo('')
    setExpanded(null); loadLogs(1)
  }

  return (
    <div className="flex-1 space-y-4 p-2 sm:p-8 pt-3 sm:pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" /> Audit Log
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {total} total entries{total > 0 && ` — page ${page} of ${pages}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setExpanded(null); loadLogs(page) }} className="rounded-full text-xs">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Entity</label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All</SelectItem>
                  {ENTITIES.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Action</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="h-9 w-28 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All</SelectItem>
                  {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <Input
                placeholder="Name, description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 w-44 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-36 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-36 text-xs" />
            </div>
            <Button size="sm" onClick={handleFilter} className="h-9 rounded-full text-xs">
              <Search className="h-3.5 w-3.5 mr-1" /> Filter
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 rounded-full text-xs text-muted-foreground">
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-0 shadow-md">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={5} className="py-12">
                  <div className="flex justify-center"><Skeleton className="h-6 w-48 rounded-full" /></div>
                </TableCell></TableRow>
              )}
              {!loading && logs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No audit entries found.
                </TableCell></TableRow>
              )}
              {!loading && logs.map(log => (
                <>
                  <TableRow
                    key={log._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{log.userName || '-'}</span>
                      {log.userRole && <Badge variant="secondary" className="ml-1 text-[10px] capitalize">{log.userRole}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-semibold border-0 ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{log.entity}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.description}</TableCell>
                  </TableRow>
                  {expanded === log._id && log.changes && Object.keys(log.changes).length > 0 && (
                    <TableRow key={`${log._id}-detail`} className="bg-muted/30">
                      <TableCell colSpan={5} className="p-3">
                        <div className="text-xs font-mono space-y-1">
                          {Object.entries(log.changes!).map(([key, val]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-semibold text-muted-foreground w-24 shrink-0">{key}:</span>
                              <span className="text-red-600 line-through">{JSON.stringify(val.from)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-700">{JSON.stringify(val.to)}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadLogs(page - 1)} className="rounded-full text-xs">
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => loadLogs(page + 1)} className="rounded-full text-xs">
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
