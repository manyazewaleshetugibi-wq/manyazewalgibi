"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import axios from "axios"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Users, Calendar, TrendingUp, DollarSign, ChevronDown, ChevronUp,
  ArrowLeft, RefreshCw, Loader2, User, Package, Clock, Search,
  BarChart3, Filter, X,
} from "lucide-react"

interface PerformanceItem {
  itemName: string
  itemId?: string
  quantity: number
  unitPrice: number
  subtotal: number
  orderNumber?: string
  orderId: string
  date: string
}

interface DailyBreakdown {
  date: string
  items: number
  revenue: number
}

interface UserPerformance {
  userId: string
  userName: string
  totalItems: number
  totalRevenue: number
  todayItems: number
  todayRevenue: number
  daysActive: number
  items: PerformanceItem[]
  dailyBreakdown: DailyBreakdown[]
}

const api = axios.create({
  baseURL: "/api",
  timeout: 0,
  headers: { "Content-Type": "application/json" },
})

export default function UserPerformancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<UserPerformance[]>([])
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"))
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [expandedDayUser, setExpandedDayUser] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      const response = await api.get(`/order/checkin-performance?${params.toString()}`)
      if (response.data?.success) {
        setData(response.data.data || [])
      }
    } catch (error) {
      console.error("Error fetching performance data:", error)
      toast.error("Failed to load performance data")
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter((u) => u.userName.toLowerCase().includes(term))
  }, [data, searchTerm])

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, u) => ({
        totalItems: acc.totalItems + u.totalItems,
        totalRevenue: acc.totalRevenue + u.totalRevenue,
        todayItems: acc.todayItems + u.todayItems,
        todayRevenue: acc.todayRevenue + u.todayRevenue,
      }),
      { totalItems: 0, totalRevenue: 0, todayItems: 0, todayRevenue: 0 }
    )
  }, [filteredData])

  const quickFilter = (days: number) => {
    setDateFrom(format(subDays(new Date(), days), "yyyy-MM-dd"))
    setDateTo(format(new Date(), "yyyy-MM-dd"))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            User Performance
          </h1>
          <p className="text-sm text-muted-foreground">
            Kitchen staff assignment statistics and item workload tracking
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Date & User Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 h-8 text-sm"
              />
            </div>
            <div className="space-y-1 relative">
              <Label className="text-xs">Search User</Label>
              <Search className="absolute left-2 top-[26px] h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="User name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 w-44 h-8 text-sm"
              />
              {searchTerm && (
                <X
                  className="absolute right-2 top-[26px] h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                />
              )}
            </div>
            <div className="flex gap-1">
              {[1, 7, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => quickFilter(d)}
                >
                  {d === 1 ? "Today" : `${d}d`}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Staff Members</span>
            </div>
            <p className="text-2xl font-bold">{filteredData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs">Total Items (Period)</span>
            </div>
            <p className="text-2xl font-bold">{totals.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Today&apos;s Items</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totals.todayItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total Revenue (Period)</span>
            </div>
            <p className="text-2xl font-bold">
              {totals.totalRevenue.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Performance List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No performance data found</p>
            <p className="text-sm mt-1">No kitchen staff have been assigned to orders in this period.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredData.map((user) => {
            const isExpanded = expandedUser === user.userId
            const isDayExpanded = expandedDayUser === user.userId

            return (
              <Card key={user.userId} className="overflow-hidden">
                {/* User Summary Row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm">
                      {user.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{user.userName}</p>
                      <p className="text-xs text-muted-foreground">{user.daysActive} day(s) active</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Today</p>
                      <p className="font-bold text-blue-600">{user.todayItems}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Items</p>
                      <p className="font-bold">{user.totalItems}</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-bold text-green-600">
                        {user.totalRevenue.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`${user.todayItems > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"}`}
                  >
                    {user.todayItems > 0 ? "Active Today" : "No Activity"}
                  </Badge>

                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    {/* Daily Breakdown Toggle */}
                    <div className="px-4 pt-3 flex items-center justify-between">
                      <p className="text-sm font-medium">Daily Breakdown</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedDayUser(isDayExpanded ? null : user.userId)
                        }}
                      >
                        {isDayExpanded ? "Hide" : "Show"} Days
                        {isDayExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                      </Button>
                    </div>

                    {isDayExpanded && (
                      <div className="px-4 pb-3">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs text-right">Items</TableHead>
                                <TableHead className="text-xs text-right">Revenue</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {user.dailyBreakdown.map((day) => (
                                <TableRow key={day.date}>
                                  <TableCell className="text-xs font-medium">{day.date}</TableCell>
                                  <TableCell className="text-xs text-right">{day.items}</TableCell>
                                  <TableCell className="text-xs text-right">
                                    {day.revenue.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Item Detail Table */}
                    <div className="px-4 pt-3 pb-4">
                      <p className="text-sm font-medium mb-2">
                        All Items ({user.items.length})
                      </p>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">#</TableHead>
                              <TableHead className="text-xs">Item</TableHead>
                              <TableHead className="text-xs text-center">Qty</TableHead>
                              <TableHead className="text-xs text-right">Unit Price</TableHead>
                              <TableHead className="text-xs text-right">Subtotal</TableHead>
                              <TableHead className="text-xs">Order</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {user.items.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="text-xs font-medium">{item.itemName}</TableCell>
                                <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                                <TableCell className="text-xs text-right">
                                  {item.unitPrice.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                                </TableCell>
                                <TableCell className="text-xs text-right font-medium">
                                  {item.subtotal.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.orderNumber || "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.date}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
