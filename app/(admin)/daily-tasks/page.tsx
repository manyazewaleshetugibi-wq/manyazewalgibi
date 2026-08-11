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
  X,
  ChevronRight,
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

// Restaurant Task Templates
const RESTAURANT_TASKS = {
  "Back of House (BOH)": [
    {
      title: "Receive and Inspect Deliveries",
      description: "Check incoming food deliveries for quality, quantity, and temperature. Verify invoices against received items. Report any discrepancies to management.",
      priority: "high" as const,
      estimatedHours: 1.5,
      category: "BOH"
    },
    {
      title: "Store Inventory Using FIFO Method",
      description: "Rotate stock using First-In-First-Out method. Log all temperatures for refrigerated and frozen items. Ensure proper labeling and dating of all stored items.",
      priority: "medium" as const,
      estimatedHours: 1,
      category: "BOH"
    },
    {
      title: "Wash, Peel, and Chop Vegetables",
      description: "Thoroughly wash all produce. Peel and chop vegetables according to prep list. Store in labeled containers with proper dating.",
      priority: "medium" as const,
      estimatedHours: 1.5,
      category: "BOH"
    },
    {
      title: "Portion, Marinate, and Trim Proteins",
      description: "Portion meats according to recipe specifications. Apply marinades and seasonings. Trim excess fat and prepare proteins for service.",
      priority: "high" as const,
      estimatedHours: 2,
      category: "BOH"
    },
    {
      title: "Prepare Stocks, Sauces, and Dressings",
      description: "Make fresh stocks from bones and vegetables. Prepare signature sauces and dressings. Cook grain bases (rice, quinoa, pasta).",
      priority: "high" as const,
      estimatedHours: 2.5,
      category: "BOH"
    },
    {
      title: "Restock Line Coolers and Prep Stations",
      description: "Refill line coolers with prepped ingredients. Restock squeeze bottles and sauce containers. Ensure all prep stations have necessary tools and ingredients.",
      priority: "medium" as const,
      estimatedHours: 1,
      category: "BOH"
    },
    {
      title: "Monitor and Read Kitchen Tickets",
      description: "Review incoming kitchen tickets, prioritize orders, and communicate with expeditor. Ensure all modifications are understood and executed correctly.",
      priority: "urgent" as const,
      estimatedHours: 4,
      category: "BOH"
    },
    {
      title: "Cook Food Across All Stations",
      description: "Cook menu items on grill, sauté, fry, and pantry stations. Maintain proper cooking temperatures and times. Ensure all food is cooked to order.",
      priority: "urgent" as const,
      estimatedHours: 4,
      category: "BOH"
    },
    {
      title: "Plate and Garnish Finished Dishes",
      description: "Plate dishes according to presentation standards. Add garnishes as specified. Ensure plate consistency and quality.",
      priority: "high" as const,
      estimatedHours: 4,
      category: "BOH"
    },
    {
      title: "Pass Food to Expeditor",
      description: "Wipe plate rims for clean presentation. Verify each dish matches the ticket. Call out for expeditor and organize passing window.",
      priority: "high" as const,
      estimatedHours: 4,
      category: "BOH"
    },
    {
      title: "Label, Date, and Store Leftover Prepped Food",
      description: "Properly label and date all remaining prepped items. Store in appropriate containers in refrigerators or freezers. Update inventory records.",
      priority: "medium" as const,
      estimatedHours: 0.5,
      category: "BOH"
    },
    {
      title: "Clean and Sanitize Kitchen Equipment",
      description: "Clean and sanitize flat tops, grills, fryers, and prep tables. Degrease hood vents and exhaust fans. Deep clean cooking equipment.",
      priority: "medium" as const,
      estimatedHours: 2,
      category: "BOH"
    },
    {
      title: "Kitchen Floor Cleaning",
      description: "Remove and wash rubber floor mats. Sweep and mop entire kitchen floor. Clean under all equipment and storage areas.",
      priority: "low" as const,
      estimatedHours: 1,
      category: "BOH"
    },
    {
      title: "Empty Kitchen Trash and Compost",
      description: "Empty all trash cans and compost bins. Replace liners and sanitize bins. Ensure proper waste segregation and disposal.",
      priority: "low" as const,
      estimatedHours: 0.5,
      category: "BOH"
    }
  ],
  "Front of House (FOH)": [
    {
      title: "Set Up Dining Room",
      description: "Wipe down all tables, arrange chairs, and set place settings. Ensure salt, pepper, sugar, and condiment caddies are full and organized.",
      priority: "medium" as const,
      estimatedHours: 1,
      category: "FOH"
    },
    {
      title: "Open Cash Drawer and POS Setup",
      description: "Count the opening cash drawer and verify amount. Turn on POS terminals and ensure all systems are operational. Print opening reports.",
      priority: "high" as const,
      estimatedHours: 0.5,
      category: "FOH"
    },
    {
      title: "Prepare Beverage Stations",
      description: "Brew fresh coffee and tea. Stock ice bins. Prep beverage garnishes (lemons, limes, mint). Ensure all beverage equipment is working.",
      priority: "medium" as const,
      estimatedHours: 0.75,
      category: "FOH"
    },
    {
      title: "Greet and Seat Guests",
      description: "Welcome guests warmly, manage the waitlist, and seat guests at appropriate tables. Provide menus and inform guests of specials.",
      priority: "urgent" as const,
      estimatedHours: 5,
      category: "FOH"
    },
    {
      title: "Take and Process Orders",
      description: "Take accurate food and drink orders from guests. Enter orders into POS system promptly. Serve food and drinks in a timely manner.",
      priority: "urgent" as const,
      estimatedHours: 5,
      category: "FOH"
    },
    {
      title: "Bus Tables and Reset Stations",
      description: "Clear plates and glassware promptly after guests finish. Sanitize tables and reset empty booths for next guests. Maintain clean dining room.",
      priority: "high" as const,
      estimatedHours: 4,
      category: "FOH"
    },
    {
      title: "Polish and Restock Silverware/Glassware",
      description: "Polish all silverware and glassware to remove spots and watermarks. Restock server stations with clean utensils and glassware.",
      priority: "medium" as const,
      estimatedHours: 1,
      category: "FOH"
    },
    {
      title: "Reconcile Server Banks and Tips",
      description: "Reconcile server cash banks and process tips. Drop final cash receipts and print closing reports. Prepare cash for deposit.",
      priority: "high" as const,
      estimatedHours: 0.75,
      category: "FOH"
    },
    {
      title: "Close Beverage Stations",
      description: "Empty and clean coffee makers, soda fountains, and ice bins. Store all beverage equipment properly. Prepare for next day's service.",
      priority: "medium" as const,
      estimatedHours: 0.75,
      category: "FOH"
    },
    {
      title: "Close Dining Room",
      description: "Put up chairs, sweep and mop dining room floors. Wipe down entrance doors and windows. Ensure all lights are off and doors are locked.",
      priority: "low" as const,
      estimatedHours: 0.75,
      category: "FOH"
    }
  ],
  "Dishwashing & Stewarding": [
    {
      title: "Scrape and Sort Incoming Tableware",
      description: "Scrape food waste from plates and sort incoming tableware by type. Separate any broken or chipped items for disposal.",
      priority: "medium" as const,
      estimatedHours: 1,
      category: "Dishwashing"
    },
    {
      title: "Load and Run Dishwashing Machine",
      description: "Load racks with sorted tableware and run through dishwashing machine. Ensure proper cycle selection and monitor wash quality.",
      priority: "medium" as const,
      estimatedHours: 2,
      category: "Dishwashing"
    },
    {
      title: "Hand-Wash Pots, Pans, and Chef Knives",
      description: "Wash pots, pans, and chef knives in the 3-compartment sink. Follow proper wash, rinse, and sanitize procedures. Air dry all items.",
      priority: "high" as const,
      estimatedHours: 1.5,
      category: "Dishwashing"
    },
    {
      title: "Restock Clean Dishes to Designated Stations",
      description: "Air-dry and organize clean dishes. Restock to their designated stations throughout the kitchen. Ensure proper organization and accessibility.",
      priority: "medium" as const,
      estimatedHours: 1,
      category: "Dishwashing"
    },
    {
      title: "Monitor Dishwasher Chemical Levels",
      description: "Check and log dishwasher chemical levels (detergent, rinse aid, sanitizer). Monitor water temperatures and replace chemicals as needed.",
      priority: "medium" as const,
      estimatedHours: 0.5,
      category: "Dishwashing"
    }
  ]
};

// Flatten all tasks for the dropdown
const ALL_TEMPLATE_TASKS = Object.values(RESTAURANT_TASKS).flat();

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

// Right Sidebar Drawer Component
function RightDrawer({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[500px] md:w-[600px] bg-white dark:bg-gray-950 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="sticky top-0 right-0 p-4 bg-white dark:bg-gray-950 border-b flex justify-end z-10">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Main Dashboard Component
function DailyTasksDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filters] = useState({ assignedTo: "", status: "", priority: "" });
  
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userFetchError, setUserFetchError] = useState<string | null>(null);
  const [selectedUserError, setSelectedUserError] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedToId: "",
    assignedToName: "",
    assignedToEmail: "",
    startTime: "",
    endTime: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
  });


  // State for template dropdown
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");

  // Filtered templates based on search
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return ALL_TEMPLATE_TASKS;
    const search = templateSearch.toLowerCase();
    return ALL_TEMPLATE_TASKS.filter(task => 
      task.title.toLowerCase().includes(search) ||
      task.description.toLowerCase().includes(search) ||
      task.category.toLowerCase().includes(search)
    );
  }, [templateSearch]);

  // Group templates by category for display
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, typeof ALL_TEMPLATE_TASKS> = {};
    filteredTemplates.forEach(task => {
      if (!groups[task.category]) groups[task.category] = [];
      groups[task.category].push(task);
    });
    return groups;
  }, [filteredTemplates]);

  // Handle template selection
  const handleTemplateSelect = (template: typeof ALL_TEMPLATE_TASKS[0]) => {
    setNewTask({
      ...newTask,
      title: template.title,
      description: template.description,
      priority: template.priority,
      estimatedHours: template.estimatedHours.toString(),
    });
    setSelectedTemplate(template.title);
    setShowTemplateDropdown(false);
    setTemplateSearch("");
  };

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

  // Stats - minimized cards with no icons
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
      setIsCreateDrawerOpen(false);
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
      setSelectedTemplate("");
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

  // Reset form when drawer closes
  const handleDrawerClose = () => {
    setIsCreateDrawerOpen(false);
    setSelectedUserError(false);
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
    setSelectedTemplate("");
    setShowTemplateDropdown(false);
    setTemplateSearch("");
  };

  // Task Card Component with minimized design
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
        <Card className={`border-l-4 hover:shadow-md transition-all ${
          task.priority === "urgent" ? "border-l-red-500" :
          task.priority === "high" ? "border-l-orange-500" :
          task.priority === "medium" ? "border-l-yellow-500" :
          "border-l-green-500"
        }`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <Badge className={`${getPriorityColor(task.priority)} text-xs px-1.5 py-0`}>
                    <span className="capitalize">{task.priority}</span>
                  </Badge>
                  <Badge className={`${getStatusColor(task.status)} text-xs px-1.5 py-0`}>
                    <span className="capitalize">
                      {task.status === "in-progress" ? "In Progress" : task.status}
                    </span>
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                      Overdue
                    </Badge>
                  )}
                  {isInProgress && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      <Timer className="h-2.5 w-2.5 mr-0.5" />
                      {elapsedTime}
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-sm sm:text-base mb-1 truncate">{task.title}</h3>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-0.5">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[100px] sm:max-w-none">{task.assignedTo.name}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" />
                    <span>{format(startDate, "MMM dd")}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{format(startDate, "hh:mm a")}</span>
                  </div>
                  {task.estimatedHours && (
                    <div className="flex items-center gap-0.5">
                      <Hourglass className="h-3 w-3" />
                      <span>{task.estimatedHours}h</span>
                    </div>
                  )}
                </div>
                
                {/* Compact time tracking info */}
                {(task.actualStartTime || task.actualCompletedTime) && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                    {task.actualStartTime && (
                      <span className="text-green-600 text-[10px]">Started: {format(new Date(task.actualStartTime), "hh:mm a")}</span>
                    )}
                    {actualDuration && (
                      <span className="bg-green-50 dark:bg-green-900/20 px-1.5 py-0 rounded-full text-green-700 text-[10px]">
                        {formatDuration(actualDuration)}
                      </span>
                    )}
                  </div>
                )}
                
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 pt-2 border-t"
                    >
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                      
                      {/* Notes Section - minimized */}
                      <div className="mt-2">
                        <Label className="text-xs font-medium">Notes</Label>
                        {isEditingNotes ? (
                          <div className="mt-1 space-y-1">
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={2}
                              placeholder="Add notes..."
                              className="text-xs p-1"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs px-2" onClick={handleSaveNotes}>Save</Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => { setNotes(task.notes || ""); setIsEditingNotes(false); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1">
                            {task.notes ? (
                              <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded text-xs">
                                {task.notes}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No notes</p>
                            )}
                            {canUpdate && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs mt-0.5 px-1" onClick={() => setIsEditingNotes(true)}>
                                <Edit3 className="h-2.5 w-2.5 mr-0.5" />
                                {task.notes ? "Edit" : "Add"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-gray-400 mt-1">
                        Assigned by: {task.assignedBy.name}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="h-6 w-6 p-0">
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
                
                {canUpdate && (
                  <>
                    {task.status === "pending" && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleStartTask(task._id)} 
                        className="h-6 px-2 text-[10px] bg-green-600 hover:bg-green-700 gap-0.5"
                      >
                        <Play className="h-2.5 w-2.5" />
                        Start
                      </Button>
                    )}
                    {task.status === "in-progress" && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleCompleteTask(task._id)} 
                        className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 gap-0.5"
                      >
                        <Check className="h-2.5 w-2.5" />
                        Done
                      </Button>
                    )}
                  </>
                )}
                
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task._id)} className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-3 w-3" />
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
      <div className="container mx-auto p-3 sm:p-4 max-w-7xl">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
          <Skeleton className="h-10" />
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  if (userFetchError) {
    return (
      <div className="container mx-auto p-3 sm:p-4 max-w-7xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-red-700 mb-1">Error Loading User Data</h2>
            <p className="text-sm text-red-600">{userFetchError}</p>
            <Button className="mt-3 h-8 text-sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-3 sm:p-4 max-w-7xl">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h2 className="text-lg font-semibold mb-1">Please Log In</h2>
            <p className="text-sm text-gray-500">You need to be logged in to access tasks</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-7xl min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
        
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Daily Task Manager
              </h1>
              {isAdmin && (
                <Badge className="text-xs bg-red-100 text-red-800">
                  <Shield className="h-2.5 w-2.5 mr-0.5" />
                  Admin
                </Badge>
              )}
              {!isAdmin && currentUser?.permissions?.canAssignTasks && (
                <Badge className="text-xs bg-blue-100 text-blue-800">
                  <UserPlus className="h-2.5 w-2.5 mr-0.5" />
                  Can Assign
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Welcome back, {currentUser?.name}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400">
              Role: {currentUser?.role || "Unknown"} | {canAssignTasks ? "✓ Can assign tasks" : "✗ Cannot assign tasks"}
            </p>
          </div>
          
          {/* Assign Task Button - Opens Right Drawer */}
          {canAssignTasks && (
            <Button 
              onClick={() => setIsCreateDrawerOpen(true)} 
              className="gap-1.5 text-sm h-9 px-3 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign Task
            </Button>
          )}
        </div>
        
        {/* Stats Cards - Minimized, no icons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-2 sm:p-3">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Total Tasks</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-2 sm:p-3">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Pending</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-2 sm:p-3">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">In Progress</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-2 sm:p-3">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Completed</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search Bar - Responsive */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input 
                  placeholder="Search tasks..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-8 text-sm h-9" 
                />
              </div>
              <Button variant="outline" onClick={() => refetchTasks()} className="gap-1.5 h-9 text-sm">
                <RefreshCw className="h-3.5 w-3.5" />Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Task Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid grid-cols-4 max-w-md h-9 text-sm">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
            <TabsTrigger value="in-progress" className="text-xs sm:text-sm">Progress</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-3">
            {isLoadingTasks ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <ListTodo className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No tasks found</p>
                  {canAssignTasks && (
                    <Button variant="outline" size="sm" className="mt-3 text-sm" onClick={() => setIsCreateDrawerOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />Assign First Task
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTasks).map(([date, dateTasks]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <h2 className="text-sm sm:text-base font-semibold">{format(new Date(date), "EEEE, MMM dd")}</h2>
                      <Badge variant="outline" className="text-xs">{dateTasks.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {dateTasks.map((task) => (<TaskCard key={task._id} task={task} />))}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
      
      {/* Right Sidebar Drawer for Assign Task */}
      <RightDrawer isOpen={isCreateDrawerOpen} onClose={handleDrawerClose}>
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              📋 Assign New Task
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a template or type a custom task
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Task Title with Template Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Task Title <span className="text-red-500">*</span></Label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type task title or select from templates..."
                      value={newTask.title}
                      onChange={(e) => {
                        setNewTask({ ...newTask, title: e.target.value });
                        setSelectedTemplate("");
                        if (e.target.value) {
                          setShowTemplateDropdown(true);
                          setTemplateSearch(e.target.value);
                        } else {
                          setShowTemplateDropdown(false);
                        }
                      }}
                      onFocus={() => {
                        if (ALL_TEMPLATE_TASKS.length > 0) {
                          setShowTemplateDropdown(true);
                          setTemplateSearch(newTask.title || "");
                        }
                      }}
                      className="text-sm pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-2"
                      onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                      type="button"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                  {selectedTemplate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewTask({ ...newTask, title: "", description: "", priority: "medium", estimatedHours: "" });
                        setSelectedTemplate("");
                      }}
                      className="h-9 px-2"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Template Dropdown */}
                <AnimatePresence>
                  {showTemplateDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-950 border rounded-lg shadow-lg max-h-80 overflow-y-auto"
                    >
                      {templateSearch && (
                        <div className="p-2 border-b">
                          <p className="text-xs text-gray-500">
                            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
                          </p>
                        </div>
                      )}
                      
                      {Object.entries(groupedTemplates).length > 0 ? (
                        Object.entries(groupedTemplates).map(([category, tasks]) => (
                          <div key={category}>
                            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {category}
                              </span>
                            </div>
                            {tasks.map((template) => (
                              <button
                                key={template.title}
                                onClick={() => handleTemplateSelect(template)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b last:border-b-0"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{template.title}</p>
                                    <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <Badge className={`${getPriorityColor(template.priority)} text-[10px] px-1.5`}>
                                      {template.priority}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] px-1.5">
                                      {template.estimatedHours}h
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500">No templates found</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {selectedTemplate && (
                <p className="text-xs text-green-600">✓ Using template: {selectedTemplate}</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Description <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Detailed description of the task"
                rows={4}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="text-sm resize-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Assign To <span className="text-red-500">*</span></Label>
              <Select onValueChange={handleUserSelect} value={newTask.assignedToId || undefined}>
                <SelectTrigger className={selectedUserError ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.filter(u => u.status === 'active').map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user.name}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUserError && (
                <p className="text-xs text-red-500">Please select a user to assign this task to</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Start Time <span className="text-red-500">*</span></Label>
                <Input
                  type="datetime-local"
                  value={newTask.startTime}
                  onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">End Time <span className="text-red-500">*</span></Label>
                <Input
                  type="datetime-local"
                  value={newTask.endTime}
                  onChange={(e) => setNewTask({ ...newTask, endTime: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Priority</Label>
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Estimated Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="e.g., 2.5"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleDrawerClose} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignTask} 
              disabled={createMutation.isPending}
              className="flex-1 gap-2"
            >
              {createMutation.isPending ? (
                <>Assigning...</>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Assign Task
                </>
              )}
            </Button>
          </div>
        </div>
      </RightDrawer>
      
      {/* Permission Management - Admin Only */}
      {isAdmin && (
        <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="fixed bottom-3 right-3 rounded-full shadow-lg h-9 w-9 p-0 sm:h-10 sm:w-10">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg p-4">
            <DialogHeader>
              <DialogTitle className="text-base">🔐 Manage Permissions</DialogTitle>
              <DialogDescription className="text-xs">Grant permission to assign tasks</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {allUsers?.filter(u => !isAdminRole(u.role)).map((user) => (
                <div key={user._id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    <Badge variant="outline" className="mt-0.5 text-[10px]">{user.role}</Badge>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs whitespace-nowrap">Assign tasks</span>
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

