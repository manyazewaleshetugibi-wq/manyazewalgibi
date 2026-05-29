"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Calendar,
  Clock,
  Plus,
  Search,
  ListTodo,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Flag,
  Star,
  AlertTriangle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  RefreshCw,
  Shield,
  UserPlus,
  Trash2,
  Edit3,
  Play,
  Check,
  Timer,
  Hourglass,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

const api = axios.create({ baseURL: "/api" });

// Types
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  permissions?: {
    canAssignTasks?: boolean;
  };
}

interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo: {
    userId: string;
    name: string;
    email: string;
  };
  assignedBy: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  startTime: string;
  endTime: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  actualStartTime?: string;
  actualCompletedTime?: string;
  completedAt?: string;
  createdAt: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: {
    canAssignTasks?: boolean;
  };
}

// Utility functions
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "low": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300";
    case "in-progress": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
    case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Helper function for case-insensitive role check
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return role.toUpperCase() === "ADMIN";
};

const hasAssignTaskPermission = (user: CurrentUser | null): boolean => {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  return user.permissions?.canAssignTasks === true;
};

// Calculate actual hours worked
const calculateActualHours = (startTime: string | undefined, completedTime: string | undefined): number | null => {
  if (!startTime || !completedTime) return null;
  const start = new Date(startTime);
  const end = new Date(completedTime);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
};

// Format duration
const formatDuration = (hours: number | null | undefined): string => {
  if (!hours) return "N/A";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0) return `${minutes} min`;
  return `${wholeHours}h ${minutes}m`;
};

// API functions
const fetchAllUsers = async () => {
  const response = await api.get("/staff");
  return response.data.data || [];
};

const fetchTasks = async (params?: any) => {
  const response = await api.get("/tasks", { params });
  return response.data.tasks;
};

const createTask = async (data: any) => {
  const response = await api.post("/tasks", data);
  return response.data;
};

const updateTask = async (id: string, data: any) => {
  const response = await api.put("/tasks", { id, ...data });
  return response.data;
};

const deleteTask = async (id: string) => {
  const response = await api.delete(`/tasks?id=${id}`);
  return response.data;
};

const updateUserPermission = async (userId: string, permissions: any) => {
  const response = await api.put(`/staff/${userId}`, { permissions });
  return response.data;
};

// Main Dashboard Component
function DailyTasksDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filters] = useState({ assignedTo: "", status: "", priority: "" });
  
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userFetchError, setUserFetchError] = useState<string | null>(null);
  const [selectedUserError, setSelectedUserError] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedToId: "",
    assignedToName: "",
    assignedToEmail: "",
    startTime: "",
    endTime: "",
    priority: "medium" as const,
    estimatedHours: "",
  });

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (sessionStatus === "loading") return;
      
      if (!session || !session.user) {
        setIsLoadingUser(false);
        setUserFetchError("Please log in to access tasks");
        return;
      }
      
      try {
        const staffRes = await fetch('/api/staff');
        const staffData = await staffRes.json();
        const staffList = staffData.data || [];
        
        const matchingStaff = staffList.find(
          (s: any) => s.email === session.user.email
        );
        
        if (matchingStaff) {
          setCurrentUser({
            id: matchingStaff._id,
            name: matchingStaff.name,
            email: matchingStaff.email,
            role: matchingStaff.role || "STAFF",
            permissions: matchingStaff.permissions || { canAssignTasks: false }
          });
        } else {
          setCurrentUser({
            id: session.user.id || session.user.email,
            name: session.user.name || "User",
            email: session.user.email,
            role: session.user.role || "STAFF",
            permissions: { canAssignTasks: false }
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUserFetchError("Failed to load user data");
        if (session.user) {
          setCurrentUser({
            id: session.user.id || session.user.email,
            name: session.user.name || "User",
            email: session.user.email,
            role: session.user.role || "STAFF",
            permissions: { canAssignTasks: false }
          });
        }
      } finally {
        setIsLoadingUser(false);
      }
    };
    
    fetchCurrentUser();
  }, [session, sessionStatus]);

  const canAssignTasks = useMemo(() => hasAssignTaskPermission(currentUser), [currentUser]);
  const isAdmin = useMemo(() => isAdminRole(currentUser?.role), [currentUser]);

  // Queries
  const { data: allUsers, isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: fetchAllUsers,
    enabled: canAssignTasks,
  });

  const { data: tasks, isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["tasks", filters, currentUser?.email],
    queryFn: () => fetchTasks(filters),
    enabled: !!currentUser,
  });

  // Filter tasks - regular users only see their tasks
  const visibleTasks = useMemo(() => {
    if (!tasks) return [];
    if (canAssignTasks) return tasks;
    return tasks.filter(task => task.assignedTo.email === currentUser?.email);
  }, [tasks, canAssignTasks, currentUser?.email]);

  // Apply search and tab filters
  const filteredTasks = useMemo(() => {
    let filtered = [...visibleTasks];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.assignedTo.name.toLowerCase().includes(query)
      );
    }
    
    if (activeTab !== "all") {
      filtered = filtered.filter((task) => task.status === activeTab);
    }
    
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return filtered.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [visibleTasks, searchQuery, activeTab]);

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach((task) => {
      const date = format(new Date(task.startTime), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
    });
    return groups;
  }, [filteredTasks]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: visibleTasks.length,
      pending: visibleTasks.filter(t => t.status === "pending").length,
      inProgress: visibleTasks.filter(t => t.status === "in-progress").length,
      completed: visibleTasks.filter(t => t.status === "completed").length,
    };
  }, [visibleTasks]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        assignedToId: "",
        assignedToName: "",
        assignedToEmail: "",
        startTime: "",
        endTime: "",
        priority: "medium",
        estimatedHours: "",
      });
      toast({ title: "✅ Success", description: "Task assigned successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "❌ Error", 
        description: error.response?.data?.error || "Failed to assign task",
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "✅ Success", description: "Task updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "✅ Success", description: "Task deleted successfully" });
    },
  });

  const handleAssignTask = () => {
    const errors = [];
    if (!newTask.title) errors.push("Title");
    if (!newTask.description) errors.push("Description");
    if (!newTask.assignedToId) errors.push("Assign To");
    if (!newTask.startTime) errors.push("Start Time");
    if (!newTask.endTime) errors.push("End Time");
    
    if (errors.length > 0) {
      toast({ 
        title: "⚠️ Missing Fields", 
        description: `Please fill in: ${errors.join(", ")}`,
        variant: "destructive" 
      });
      if (!newTask.assignedToId) setSelectedUserError(true);
      return;
    }
    
    const taskData = {
      title: newTask.title,
      description: newTask.description,
      assignedToId: newTask.assignedToId,
      assignedToName: newTask.assignedToName,
      assignedToEmail: newTask.assignedToEmail,
      startTime: newTask.startTime,
      endTime: newTask.endTime,
      priority: newTask.priority,
      estimatedHours: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) : null,
    };
    
    createMutation.mutate(taskData);
  };

  // Handle start task - records actual start time
  const handleStartTask = (taskId: string) => {
    const now = new Date().toISOString();
    updateMutation.mutate({ 
      id: taskId, 
      data: { 
        status: "in-progress",
        actualStartTime: now
      } 
    });
    toast({ title: "▶️ Task Started", description: "Good luck! Time tracking has begun." });
  };

  // Handle complete task - records actual completed time and calculates duration
  const handleCompleteTask = (taskId: string) => {
    const now = new Date().toISOString();
    updateMutation.mutate({ 
      id: taskId, 
      data: { 
        status: "completed",
        actualCompletedTime: now,
        completedAt: now
      } 
    });
    toast({ title: "🎉 Task Completed!", description: "Great job! Task has been marked as completed." });
  };

  const handleUpdateNotes = (taskId: string, notes: string) => {
    updateMutation.mutate({ id: taskId, data: { notes } });
  };

  const handleDeleteTask = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleUserSelect = (userId: string) => {
    const user = allUsers?.find(u => u._id === userId);
    if (user) {
      setNewTask({
        ...newTask,
        assignedToId: user._id,
        assignedToName: user.name,
        assignedToEmail: user.email,
      });
      setSelectedUserError(false);
    }
  };

  const handlePermissionToggle = async (userId: string, currentPermission: boolean) => {
    try {
      const newPermission = !currentPermission;
      await updateUserPermission(userId, { canAssignTasks: newPermission });
      await refetchUsers();
      toast({ 
        title: "✅ Permission Updated", 
        description: `User can now ${newPermission ? 'assign tasks' : 'not assign tasks'}`
      });
    } catch (error) {
      toast({ 
        title: "❌ Error", 
        description: "Failed to update permission", 
        variant: "destructive" 
      });
    }
  };

  // Task Card Component with Start/Complete tracking
  const TaskCard = ({ task }: { task: Task }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [notes, setNotes] = useState(task.notes || "");
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    
    const startDate = new Date(task.startTime);
    const endDate = new Date(task.endTime);
    const isOverdue = task.status !== "completed" && endDate < new Date();
    const canUpdate = isAdmin || task.assignedTo.email === currentUser?.email;
    
    // Calculate actual duration if task is completed
    const actualDuration = task.status === "completed" && task.actualStartTime && task.actualCompletedTime
      ? calculateActualHours(task.actualStartTime, task.actualCompletedTime)
      : null;
    
    // Calculate if task is currently in progress and for how long
    const isInProgress = task.status === "in-progress" && task.actualStartTime;
    const elapsedTime = isInProgress 
      ? formatDistanceToNow(new Date(task.actualStartTime!), { addSuffix: false })
      : null;
    
    const handleSaveNotes = async () => {
      await updateMutation.mutateAsync({ id: task._id, data: { notes } });
      setIsEditingNotes(false);
    };
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={`border-l-4 hover:shadow-lg transition-all ${
          task.priority === "urgent" ? "border-l-red-500" :
          task.priority === "high" ? "border-l-orange-500" :
          task.priority === "medium" ? "border-l-yellow-500" :
          "border-l-green-500"
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority === "urgent" ? <AlertTriangle className="h-3 w-3 mr-1" /> :
                     task.priority === "high" ? <Flag className="h-3 w-3 mr-1" /> :
                     task.priority === "medium" ? <Star className="h-3 w-3 mr-1" /> :
                     <Flag className="h-3 w-3 mr-1" />}
                    <span className="capitalize">{task.priority}</span>
                  </Badge>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status === "completed" ? <CheckCircle className="h-3 w-3 mr-1" /> :
                     task.status === "in-progress" ? <PlayCircle className="h-3 w-3 mr-1" /> :
                     <AlertCircle className="h-3 w-3 mr-1" />}
                    <span className="capitalize">
                      {task.status === "in-progress" ? "In Progress" : task.status}
                    </span>
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive" className="animate-pulse">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                  {isInProgress && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Timer className="h-3 w-3 mr-1" />
                      {elapsedTime} elapsed
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Assigned to: {task.assignedTo.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>{task.assignedTo.email}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Scheduled: {format(startDate, "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{format(startDate, "hh:mm a")} - {format(endDate, "hh:mm a")}</span>
                  </div>
                  {task.estimatedHours && (
                    <div className="flex items-center gap-1">
                      <Hourglass className="h-3 w-3" />
                      <span>Est: {task.estimatedHours}h</span>
                    </div>
                  )}
                </div>
                
                {/* Time Tracking Info */}
                {(task.actualStartTime || task.actualCompletedTime) && (
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {task.actualStartTime && (
                      <div className="flex items-center gap-1">
                        <Play className="h-3 w-3 text-green-600" />
                        <span>Started: {format(new Date(task.actualStartTime), "MMM dd, hh:mm a")}</span>
                      </div>
                    )}
                    {task.actualCompletedTime && (
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-600" />
                        <span>Completed: {format(new Date(task.actualCompletedTime), "MMM dd, hh:mm a")}</span>
                      </div>
                    )}
                    {actualDuration && (
                      <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                        <Timer className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-700 dark:text-green-400">
                          Actual Duration: {formatDuration(actualDuration)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t"
                    >
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {task.description}
                      </p>
                      
                      {/* Notes Section */}
                      <div className="mt-3">
                        <Label className="text-sm font-medium">Notes</Label>
                        {isEditingNotes ? (
                          <div className="mt-1 space-y-2">
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={2}
                              placeholder="Add notes about this task..."
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => { setNotes(task.notes || ""); setIsEditingNotes(false); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1">
                            {task.notes ? (
                              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                <p className="text-sm">{task.notes}</p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic">No notes added yet</p>
                            )}
                            {canUpdate && (
                              <Button variant="ghost" size="sm" className="mt-1" onClick={() => setIsEditingNotes(true)}>
                                <Edit3 className="h-3 w-3 mr-1" />
                                {task.notes ? "Edit Notes" : "Add Notes"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {task.completedAt && (
                        <p className="text-xs text-gray-400 mt-2">
                          Marked completed on: {format(new Date(task.completedAt), "MMM dd, yyyy hh:mm a")}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-2">
                        Assigned by: {task.assignedBy.name} ({task.assignedBy.role})
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="h-8 w-8 p-0">
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                {/* Action Buttons based on task status */}
                {canUpdate && (
                  <>
                    {task.status === "pending" && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleStartTask(task._id)} 
                        className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Start Task
                      </Button>
                    )}
                    {task.status === "in-progress" && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleCompleteTask(task._id)} 
                        className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Complete Task
                      </Button>
                    )}
                  </>
                )}
                
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task._id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Loading states
  if (isLoadingUser || sessionStatus === "loading") {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-12" />
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  if (userFetchError) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading User Data</h2>
            <p className="text-red-600">{userFetchError}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
            <p className="text-gray-500">You need to be logged in to access tasks</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Daily Task Manager
              </h1>
              {isAdmin && (
                <Badge className="bg-red-100 text-red-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              {!isAdmin && currentUser?.permissions?.canAssignTasks && (
                <Badge className="bg-blue-100 text-blue-800">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Can Assign Tasks
                </Badge>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {currentUser?.name}! 
              {!canAssignTasks ? " Here are your assigned tasks" : " You can assign tasks to team members"}
            </p>
            <div className="text-xs text-gray-400 mt-1">
              Role: {currentUser?.role || "Unknown"} | {canAssignTasks ? "✓ Can assign tasks" : "✗ Cannot assign tasks"}
            </div>
          </div>
          
          {/* Assign Task Button - Only for users with permission */}
          {canAssignTasks && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4" />
                  Assign New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>📋 Assign New Task</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to assign a task to a team member
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter task title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of the task"
                      rows={3}
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assign To *</Label>
                    <Select onValueChange={handleUserSelect} value={newTask.assignedToId || undefined}>
                      <SelectTrigger className={selectedUserError ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers?.filter(u => u.status === 'active').map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span>{user.name}</span>
                              <span className="text-xs text-gray-500">({user.email})</span>
                              <Badge variant="outline" className="ml-2">{user.role}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedUserError && (
                      <p className="text-xs text-red-500">Please select a user to assign this task to</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Scheduled Start Time *</Label>
                      <Input
                        id="startTime"
                        type="datetime-local"
                        value={newTask.startTime}
                        onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Scheduled End Time *</Label>
                      <Input
                        id="endTime"
                        type="datetime-local"
                        value={newTask.endTime}
                        onChange={(e) => setNewTask({ ...newTask, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        step="0.5"
                        placeholder="e.g., 2.5"
                        value={newTask.estimatedHours}
                        onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    setSelectedUserError(false);
                  }}>Cancel</Button>
                  <Button onClick={handleAssignTask} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Assigning..." : "Assign Task"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-500">Total Tasks</p><p className="text-2xl font-bold">{stats.total}</p></div>
                <ListTodo className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-500">In Progress</p><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p></div>
                <PlayCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{stats.completed}</p></div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" onClick={() => refetchTasks()} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Task Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 max-w-md">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            {isLoadingTasks ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tasks found</p>
                  {canAssignTasks && (
                    <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />Assign Your First Task
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedTasks).map(([date, dateTasks]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h2 className="text-lg font-semibold">{format(new Date(date), "EEEE, MMMM dd, yyyy")}</h2>
                      <Badge variant="outline">{dateTasks.length} tasks</Badge>
                    </div>
                    <div className="space-y-3">
                      {dateTasks.map((task) => (<TaskCard key={task._id} task={task} />))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
      
      {/* Permission Management - Admin Only */}
      {isAdmin && (
        <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="fixed bottom-4 right-4 rounded-full shadow-lg" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>🔐 Manage Task Assignment Permissions</DialogTitle>
              <DialogDescription>Grant permission to users who can assign tasks to others</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {allUsers?.filter(u => !isAdminRole(u.role)).map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <Badge variant="outline" className="mt-1">{user.role}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Can assign tasks</span>
                    <Switch
                      checked={user.permissions?.canAssignTasks || false}
                      onCheckedChange={() => handlePermissionToggle(user._id, user.permissions?.canAssignTasks || false)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const queryClient = new QueryClient();

export default function DailyTasksPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DailyTasksDashboard />
    </QueryClientProvider>
  );
}