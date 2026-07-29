"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, User, Shield, Utensils, Package, DollarSign, ShoppingCart, Trash2, X, Search, Plus, ArrowLeft, TrendingUp, Clock, Calendar, Truck, Coffee } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StaffRegistrationForm } from "@/components/staff-registration-form"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

// API client setup
const api = axios.create({
  baseURL: "/api",
})

// API functions
const fetchStaff = () => api.get("/staff").then((res) => res.data.data)

// Types
interface Staff {
  _id: string
  name: string
  email: string
  role: string
  employeeId: string
  phone: string
  status: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

// Helper functions
const formatRole = (role?: string) => {
  if (!role) return 'Unassigned'
  return role.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

// Role Icons Mapping
const roleIcons = {
  admin: Shield,
  kitchen: Utensils,
  stock_manager: Package,
  purchasing: ShoppingCart,
  delivery: Truck,
  fb: Users,
  marketing: TrendingUp,
  finance: DollarSign,
  pos: ShoppingCart,
  waitress: User,
  barista: Coffee,
  coffee_maker: Coffee,
  default: User
}

// Role Colors Mapping
const roleColors = {
  admin: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30",
  kitchen: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30",
  stock_manager: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30",
  purchasing: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/30",
  delivery: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800/30",
  fb: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30",
  marketing: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30",
  finance: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800/30",
  pos: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30",
  waitress: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800/30",
  barista: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800/30",
  coffee_maker: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30"
}

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-40">
    <div className="relative h-20 w-20">
      <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
      <div className="absolute inset-2 rounded-full border-r-2 border-primary/60 animate-spin animate-reverse"></div>
      <div className="absolute inset-4 rounded-full border-b-2 border-primary/40 animate-spin animate-delay-150"></div>
    </div>
  </div>
)

function StaffManagement() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)

  const { data: staff, isLoading: isLoadingStaff } = useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: fetchStaff,
  })

  // Staff by role grouping
  const staffByRole = useMemo(() => {
    if (!staff) return {};
    return staff.reduce((acc, staffMember) => {
      const role = staffMember.role || 'unassigned';
      if (!acc[role]) acc[role] = [];
      acc[role].push(staffMember);
      return acc;
    }, {} as Record<string, Staff[]>);
  }, [staff])

  // Role statistics
  const roleStatistics = useMemo(() => {
    if (!staffByRole) return [];
    return Object.entries(staffByRole).map(([role, members]) => ({
      role,
      count: members.length,
      activeCount: members.filter(m => m.status === 'active').length,
      inactiveCount: members.filter(m => m.status === 'inactive').length,
      Icon: roleIcons[role as keyof typeof roleIcons] || roleIcons.default,
      color: roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    })).sort((a, b) => b.count - a.count);
  }, [staffByRole])

  // Filtered staff
  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    let filtered = [...staff];
    if (selectedRole !== 'all') {
      filtered = filtered.filter(member => member.role === selectedRole);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.employeeId.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [staff, selectedRole, statusFilter, searchQuery])

  // Staff status stats
  const staffStatusStats = useMemo(() => {
    if (!staff) return { active: 0, inactive: 0, total: 0 };
    return {
      active: staff.filter(s => s.status === 'active').length,
      inactive: staff.filter(s => s.status === 'inactive').length,
      total: staff.length
    };
  }, [staff])

  // Handle delete staff member
  const handleDeleteStaff = async (id: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      try {
        await api.delete(`/staff/${id}`);
        queryClient.invalidateQueries({ queryKey: ["staff"] });
      } catch (error: any) {
        console.error("Failed to delete staff", error);
        alert(error.response?.data?.message || "Failed to delete staff member");
      }
    }
  };

  // Handle toggle staff status
  const handleToggleStatus = async (staffMember: Staff) => {
    const newStatus = staffMember.status === 'active' ? 'inactive' : 'active';
    const previousStatus = staffMember.status;
    
    queryClient.setQueryData<Staff[]>(["staff"], (old = []) => {
      return old.map(s => s._id === staffMember._id ? { ...s, status: newStatus } : s);
    });
    
    try {
      const response = await api.put(`/staff/${staffMember._id}`, {
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        phone: staffMember.phone,
        employeeId: staffMember.employeeId,
        status: newStatus,
        permissions: staffMember.permissions || []
      });
      
      if (!response.data.success) {
        queryClient.setQueryData<Staff[]>(["staff"], (old = []) => {
          return old.map(s => s._id === staffMember._id ? { ...s, status: previousStatus } : s);
        });
        alert("Failed to update status");
      }
    } catch (error: any) {
      queryClient.setQueryData<Staff[]>(["staff"], (old = []) => {
        return old.map(s => s._id === staffMember._id ? { ...s, status: previousStatus } : s);
      });
      alert(error.response?.data?.message || "Failed to update staff status");
    }
  };

  const handleStaffAdded = () => {
    setShowRegistrationForm(false);
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  };

  // Get all available roles for the dropdown
  const allRoles = useMemo(() => {
    if (!staff) return [];
    const roles = new Set(staff.map(s => s.role));
    return Array.from(roles).sort();
  }, [staff]);

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Button variant="outline" size="sm" onClick={() => router.push('/')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </motion.div>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent dark:from-primary dark:to-blue-400">
                  Staff Management
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Manage your restaurant staff members, roles, and permissions
                </p>
              </motion.div>
            </div>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Button onClick={() => setShowRegistrationForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Staff
              </Button>
            </motion.div>
          </div>

          {/* Date Display */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/50 rounded-lg p-3 w-fit shadow-sm border dark:border-gray-800"
          >
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </motion.div>

          {/* Staff Registration Modal - Direct form without extra card */}
          <AnimatePresence>
            {showRegistrationForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowRegistrationForm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Register New Staff Member
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowRegistrationForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-6">
                    <StaffRegistrationForm onSuccess={handleStaffAdded} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoadingStaff ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Staff Status Summary Cards */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="grid gap-4 md:grid-cols-3"
              >
                <Card className="bg-gradient-to-br from-green-100/50 to-green-50/30 border-green-200 dark:from-green-900/20 dark:to-green-900/10 dark:border-green-800/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Active Staff</CardTitle>
                    <div className="p-2 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Users className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{staffStatusStats.active}</div>
                    <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                      {Math.round((staffStatusStats.active / staffStatusStats.total) * 100)}% of total
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-gray-100/50 to-gray-50/30 border-gray-200 dark:from-gray-800/20 dark:to-gray-800/10 dark:border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Inactive Staff</CardTitle>
                    <div className="p-2 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{staffStatusStats.inactive}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {Math.round((staffStatusStats.inactive / staffStatusStats.total) * 100)}% of total
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-100/50 to-blue-50/30 border-blue-200 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-blue-800/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Staff</CardTitle>
                    <div className="p-2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{staffStatusStats.total}</div>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      Across {roleStatistics.length} departments
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Filters */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Card className="border dark:border-gray-800">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name, email, or employee ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-[300px]">
                            <SelectItem value="all">All Roles</SelectItem>
                            {allRoles.map((role) => {
                              const Icon = roleIcons[role as keyof typeof roleIcons] || roleIcons.default;
                              return (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3 w-3" />
                                    {formatRole(role)}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-green-500"></span>
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                              Inactive
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {(searchQuery || selectedRole !== 'all' || statusFilter !== 'all') && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedRole('all');
                            setStatusFilter('all');
                          }}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Staff Table */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Card className="border dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Staff Members ({filteredStaff.length})
                    </CardTitle>
                    <CardDescription>View and manage all registered staff</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredStaff.length > 0 ? (
                      <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Joined</TableHead>
                              <TableHead className="w-[140px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStaff.map((staffMember) => {
                              const Icon = roleIcons[staffMember.role as keyof typeof roleIcons] || roleIcons.default;
                              const roleColor = roleColors[staffMember.role as keyof typeof roleColors] || "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
                              
                              return (
                                <TableRow key={staffMember._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-primary" />
                                      </div>
                                      {staffMember.name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{staffMember.email}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1 rounded ${roleColor.split(' ')[0]} ${roleColor.split(' ')[1]}`}>
                                        <Icon className="h-3 w-3" />
                                      </div>
                                      <Badge variant="outline" className={roleColor}>
                                        {formatRole(staffMember.role)}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                                      {staffMember.employeeId}
                                    </code>
                                  </TableCell>
                                  <TableCell>{staffMember.phone}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        staffMember.status === 'active' 
                                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30" 
                                          : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                      }
                                    >
                                      {staffMember.status === 'active' ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-500 dark:text-gray-400">
                                    {new Date(staffMember.createdAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-2 border rounded-md px-2 py-1">
                                        <span className={`text-xs font-medium ${staffMember.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                                          {staffMember.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                        <Switch
                                          checked={staffMember.status === 'active'}
                                          onCheckedChange={() => handleToggleStatus(staffMember)}
                                          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
                                        />
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                        onClick={() => handleDeleteStaff(staffMember._id)}
                                        title="Delete staff member"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                          <Users className="h-12 w-12 text-gray-400" />
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">No staff members found</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                          {searchQuery || selectedRole !== 'all' || statusFilter !== 'all'
                            ? 'Try adjusting your filter criteria'
                            : 'Click the "Add New Staff" button to get started'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Role Summary */}
              {staff && staff.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <Card className="border dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Department Summary
                      </CardTitle>
                      <CardDescription>Staff distribution by role</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {roleStatistics.map((stat) => (
                          <div key={stat.role} className="text-center p-3 rounded-lg border dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-900">
                            <div className="flex flex-col items-center">
                              <div className={`p-2 rounded-full ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]} mb-2`}>
                                <stat.Icon className="h-4 w-4" />
                              </div>
                              <p className="text-sm font-medium">{formatRole(stat.role)}</p>
                              <p className="text-2xl font-bold">{stat.count}</p>
                              <div className="flex gap-2 mt-1 text-xs">
                                <span className="text-green-600 dark:text-green-400">{stat.activeCount} active</span>
                                <span className="text-gray-500 dark:text-gray-400">{stat.inactiveCount} inactive</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const queryClient = new QueryClient()

export default function StaffManagementPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <StaffManagement />
    </QueryClientProvider>
  )
}