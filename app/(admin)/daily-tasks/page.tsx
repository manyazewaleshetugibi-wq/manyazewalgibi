"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  ChevronLeft,
  BarChart3,
  Users as UsersIcon,
  CalendarRange,
  Loader2,
  Mic,
  Volume2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  format,
  formatDistanceToNow,
  startOfMonth,
  endOfMonth,
  addMonths,
  parseISO,
} from "date-fns";
import { toast } from "@/hooks/use-toast";
import { VoiceRecorder } from "@/components/VoiceRecorder";

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
  status: "pending" | "in-progress" | "completed" | "cancelled" | "missed";
  priority: "low" | "medium" | "high" | "urgent";
  estimatedHours?: number;
  actualHours?: number;
  notes?: any;
  actualStartTime?: string;
  actualCompletedTime?: string;
  completedAt?: string;
  createdAt: string;
  deletedAt?: string | null;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: any;
}

// Permission may be stored either as an array of strings (e.g. ['canAssignTasks'])
// matching the schema, or as an object (legacy { canAssignTasks: true }).
const hasCanAssignPermission = (permissions: any): boolean => {
  if (!permissions) return false;
  if (Array.isArray(permissions)) return permissions.includes("canAssignTasks");
  return permissions.canAssignTasks === true;
};

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
    case "missed": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Effective status: a task is automatically "missed" once its end time passes
const effectiveStatus = (task: Task, now?: number): Task["status"] => {
  if (task.status === "completed" || task.status === "cancelled") return task.status;
  const ts = now ?? Date.now();
  if (new Date(task.endTime).getTime() < ts) return "missed";
  return task.status;
};

// Local day boundaries for date filters (sent as local ISO strings)
const dayStart = (d: Date) => format(d, "yyyy-MM-dd'T'00:00:00");
const dayEnd = (d: Date) => format(d, "yyyy-MM-dd'T'23:59:59");

// Notes may be a plain string (legacy) or an object { voice?, text? }
const getNoteText = (notes: any): string =>
  typeof notes === "string" ? notes : (notes?.text || "");

const getNoteVoice = (notes: any): string | null =>
  notes && typeof notes === "object" && notes.voice ? notes.voice : null;

// Helper function for case-insensitive role check
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return role.toUpperCase() === "ADMIN";
};

const hasAssignTaskPermission = (user: CurrentUser | null): boolean => {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  return hasCanAssignPermission(user.permissions);
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
  return response.data;
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

// Build the permissions array with canAssignTasks toggled on/off.
const withCanAssignPermission = (currentPermissions: any, enabled: boolean): string[] => {
  const base = Array.isArray(currentPermissions)
    ? currentPermissions.slice()
    : [];
  const idx = base.indexOf("canAssignTasks");
  if (enabled && idx === -1) base.push("canAssignTasks");
  if (!enabled && idx !== -1) base.splice(idx, 1);
  return base;
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

// Report Component - per-user monthly task report
function TaskReport({ allUsers }: { allUsers: User[] }) {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const monthStart = parseISO(`${month}-01`);
  const from = dayStart(startOfMonth(monthStart));
  const to = dayEnd(endOfMonth(monthStart));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tasks-report", month],
    queryFn: () => fetchTasks({ from, to, limit: 500, includeDeleted: 1 }),
  });

  const reportTasks: Task[] = useMemo(
    () => (data?.tasks || []).map((t: any) => ({ ...t, status: effectiveStatus(t) })),
    [data]
  );

  interface UserRow {
    email: string;
    name: string;
    total: number;
    completed: number;
    onTime: number;
    late: number;
    missed: number;
    pending: number;
    inProgress: number;
    cancelled: number;
    totalHours: number;
  }

  const rows = useMemo<UserRow[]>(() => {
    const zero = (email: string, name: string): UserRow => ({
      email, name, total: 0, completed: 0, onTime: 0, late: 0, missed: 0, pending: 0, inProgress: 0, cancelled: 0, totalHours: 0,
    });
    const map = new Map<string, UserRow>();
    allUsers.filter(u => u.status === 'active').forEach(u => map.set(u.email, zero(u.email, u.name)));

    reportTasks.forEach(t => {
      const email = t.assignedTo.email;
      const r = map.get(email) || zero(email, t.assignedTo.name);
      r.total += 1;
      if (t.status === "completed") {
        r.completed += 1;
        const end = new Date(t.endTime).getTime();
        const completedAt = t.actualCompletedTime ? new Date(t.actualCompletedTime).getTime() : Date.now();
        if (completedAt <= end) r.onTime += 1;
        else r.late += 1;
        const h = calculateActualHours(t.actualStartTime, t.actualCompletedTime) || (t.actualHours as any);
        if (typeof h === "number") r.totalHours += h;
      } else if (t.status === "missed") r.missed += 1;
      else if (t.status === "pending") r.pending += 1;
      else if (t.status === "in-progress") r.inProgress += 1;
      else if (t.status === "cancelled") r.cancelled += 1;
      map.set(email, r);
    });

    let list = [...map.values()];
    if (userSearch) {
      const q = userSearch.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.total - a.total);
  }, [reportTasks, allUsers, userSearch]);

  const monthStats = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const completed = rows.reduce((s, r) => s + r.completed, 0);
    const missed = rows.reduce((s, r) => s + r.missed, 0);
    const pending = rows.reduce((s, r) => s + r.pending, 0);
    const inProgress = rows.reduce((s, r) => s + r.inProgress, 0);
    const cancelled = rows.reduce((s, r) => s + r.cancelled, 0);
    const ended = completed + missed;
    const rate = ended > 0 ? Math.round((completed / ended) * 100) : 0;
    let onTime = 0;
    let late = 0;
    reportTasks.forEach((t) => {
      if (t.status !== "completed") return;
      const end = new Date(t.endTime).getTime();
      const completedAt = t.actualCompletedTime ? new Date(t.actualCompletedTime).getTime() : Date.now();
      if (completedAt <= end) onTime += 1;
      else late += 1;
    });
    return { total, completed, missed, pending, inProgress, cancelled, rate, onTime, late };
  }, [rows, reportTasks]);

  const selectedTasks = useMemo(() => {
    if (!selectedEmail) return [];
    return reportTasks
      .filter(t => t.assignedTo.email === selectedEmail)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [reportTasks, selectedEmail]);

  const selectedRow = rows.find(r => r.email === selectedEmail);

  const changeMonth = (delta: number) => {
    const next = addMonths(parseISO(`${month}-01`), delta);
    setMonth(format(next, "yyyy-MM"));
  };

  const outcomeOf = (t: Task): { label: string; color: string } => {
    if (t.status === "completed") {
      const end = new Date(t.endTime).getTime();
      const completed = t.actualCompletedTime ? new Date(t.actualCompletedTime).getTime() : Date.now();
      if (completed > end) return { label: "Late", color: "bg-orange-100 text-orange-800" };
      return { label: "On Time", color: "bg-green-100 text-green-800" };
    }
    if (t.status === "missed") return { label: "Missed", color: "bg-red-100 text-red-800" };
    if (t.status === "in-progress") return { label: "In Progress", color: "bg-blue-100 text-blue-800" };
    if (t.status === "pending") return { label: "Pending", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Cancelled", color: "bg-gray-100 text-gray-800" };
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-base sm:text-lg font-semibold">Monthly Task Report</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => changeMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[110px] text-center">{format(monthStart, "MMMM yyyy")}</span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => changeMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setMonth(format(new Date(), "yyyy-MM"))}>
                Today
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
            <div className="rounded-lg border p-2">
              <p className="text-[10px] text-gray-500">Total Tasks</p>
              <p className="text-lg font-bold">{monthStats.total}</p>
            </div>
            <div className="rounded-lg border border-green-200 p-2">
              <p className="text-[10px] text-gray-500">Completed</p>
              <p className="text-lg font-bold text-green-600">{monthStats.completed}</p>
            </div>
            <div className="rounded-lg border border-orange-200 p-2">
              <p className="text-[10px] text-gray-500">On Time</p>
              <p className="text-lg font-bold text-orange-600">{monthStats.onTime}</p>
            </div>
            <div className="rounded-lg border border-amber-200 p-2">
              <p className="text-[10px] text-gray-500">Late</p>
              <p className="text-lg font-bold text-amber-600">{monthStats.late}</p>
            </div>
            <div className="rounded-lg border border-red-200 p-2">
              <p className="text-[10px] text-gray-500">Missed</p>
              <p className="text-lg font-bold text-red-600">{monthStats.missed}</p>
            </div>
            <div className="rounded-lg border border-blue-200 p-2">
              <p className="text-[10px] text-gray-500">Completion Rate</p>
              <p className="text-lg font-bold text-blue-600">{monthStats.rate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold">Staff Performance</h3>
              <Badge variant="outline" className="text-xs">{rows.length} users</Badge>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Filter by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Completed</TableHead>
                <TableHead className="text-center">On Time</TableHead>
                <TableHead className="text-center">Late</TableHead>
                <TableHead className="text-center">Missed</TableHead>
                <TableHead className="text-center">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-sm text-gray-500">
                    No users found for the selected month
                  </TableCell>
                </TableRow>
              ) : rows.map((r) => {
                const ended = r.completed + r.missed;
                const rate = ended > 0 ? Math.round((r.completed / ended) * 100) : 0;
                const isSelected = selectedEmail === r.email;
                return (
                  <TableRow
                    key={r.email}
                    onClick={() => setSelectedEmail(isSelected ? null : r.email)}
                    className="cursor-pointer"
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{r.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{r.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{r.total}</TableCell>
                    <TableCell className="text-center font-semibold text-green-600">{r.completed}</TableCell>
                    <TableCell className="text-center text-green-600">{r.onTime}</TableCell>
                    <TableCell className="text-center text-amber-600">{r.late}</TableCell>
                    <TableCell className="text-center font-semibold text-red-600">{r.missed}</TableCell>
                    <TableCell className="text-center text-gray-700 dark:text-gray-200">
                      {r.totalHours > 0 ? `${Math.round(r.totalHours * 10) / 10}h` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rate >= 70 ? "bg-green-500" : rate >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-9">{rate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRow && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{selectedRow.name} — {format(monthStart, "MMMM yyyy")}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="text-[10px] bg-green-100 text-green-800 border-green-200">✓ {selectedRow.completed} completed</Badge>
                <Badge className="text-[10px] bg-red-100 text-red-800 border-red-200">✗ {selectedRow.missed} missed</Badge>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedEmail(null)}>
                  <X className="h-3 w-3 mr-0.5" />Close
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Finished</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-sm text-gray-500">
                        No tasks for this month
                      </TableCell>
                    </TableRow>
                  ) : selectedTasks.map((t) => {
                    const oc = outcomeOf(t);
                    const duration = t.status === "completed" && t.actualStartTime && t.actualCompletedTime
                      ? formatDuration(calculateActualHours(t.actualStartTime, t.actualCompletedTime))
                      : (t.actualHours ? formatDuration(t.actualHours) : "—");
                    return (
                      <TableRow key={t._id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(t.startTime), "MMM dd")}
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px]">
                          <p className="font-medium truncate">{t.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">{t.priority} priority</p>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(t.startTime), "hh:mm a")} – {format(new Date(t.endTime), "hh:mm a")}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {t.actualStartTime ? format(new Date(t.actualStartTime), "hh:mm a") : "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {t.actualCompletedTime ? format(new Date(t.actualCompletedTime), "hh:mm a") : "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{duration}</TableCell>
                        <TableCell>
                          <Badge className={`${oc.color} text-[10px] border px-1.5 py-0`}>{oc.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
  // Date range filter keeps payloads small (performance)
  const [rangeFrom, setRangeFrom] = useState(() => dayStart(startOfMonth(new Date())));
  const [rangeTo, setRangeTo] = useState(() => dayEnd(endOfMonth(addMonths(new Date(), 1))));
  const [taskLimit, setTaskLimit] = useState(200);
  // Clock tick used to enforce start/end time windows in real time
  const [nowTs, setNowTs] = useState(() => Date.now());
  
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
    estimatedHours: "",
    voiceNote: "",
    repeat: "" as "" | "3" | "7" | "10" | "30",
  });


  // State for template dropdown
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [customTitleMode, setCustomTitleMode] = useState(false);

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
    setCustomTitleMode(false);
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

  const { data: tasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ["tasks", filters, currentUser?.email, rangeFrom, rangeTo, taskLimit],
    queryFn: () => fetchTasks({ ...filters, from: rangeFrom, to: rangeTo, limit: taskLimit }),
    enabled: !!currentUser,
  });

  const tasks: Task[] | undefined = tasksData?.tasks;
  const hasMoreTasks: boolean = tasksData?.hasMore === true;

  // Filter tasks - regular users only see their tasks
  const visibleTasks = useMemo(() => {
    if (!tasks) return [];
    if (canAssignTasks) return tasks;
    const myEmail = (currentUser?.email || "").toLowerCase();
    return tasks.filter(task =>
      (task.assignedTo.email || "").toLowerCase() === myEmail
    );
  }, [tasks, canAssignTasks, currentUser?.email]);

  // Normalize status so tasks whose end time passed show as "missed" immediately
  const normalizedTasks = useMemo(() => {
    return visibleTasks.map((t) => ({ ...t, status: effectiveStatus(t, nowTs) }));
  }, [visibleTasks, nowTs]);

  // Apply search and tab filters
  const filteredTasks = useMemo(() => {
    let filtered = [...normalizedTasks];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.assignedTo.name.toLowerCase().includes(query)
      );
    }
    
    if (activeTab !== "all" && activeTab !== "report") {
      filtered = filtered.filter((task) => task.status === activeTab);
    }
    
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return filtered.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [normalizedTasks, searchQuery, activeTab]);

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
      total: normalizedTasks.length,
      pending: normalizedTasks.filter(t => t.status === "pending").length,
      inProgress: normalizedTasks.filter(t => t.status === "in-progress").length,
      completed: normalizedTasks.filter(t => t.status === "completed").length,
      missed: normalizedTasks.filter(t => t.status === "missed").length,
    };
  }, [normalizedTasks]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-report"] });
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
        voiceNote: "",
        repeat: "",
      });
      setSelectedTemplate("");
      toast({
        title: "✅ Success",
        description: data?.count && data.count > 1
          ? `${data.count} tasks created (daily for ${data.count} days)`
          : "Task assigned successfully",
      });
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
      queryClient.invalidateQueries({ queryKey: ["tasks-report"] });
      toast({ title: "✅ Success", description: "Task updated successfully" });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "⏱️ Cannot Update",
        description: error.response?.data?.error || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-report"] });
      toast({ title: "✅ Success", description: "Task deleted successfully" });
    },
  });

  // Clock tick - keeps time-window gating (start/finish) live
  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAssignTask = () => {
    const errors = [];
    // Title & description are optional when a voice note is provided.
    const hasVoice = !!newTask.voiceNote;
    if (!newTask.title && !hasVoice) errors.push("Title");
    if (!newTask.description && !hasVoice) errors.push("Description");
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

    const startTs = new Date(newTask.startTime).getTime();
    const endTs = new Date(newTask.endTime).getTime();
    if (isNaN(startTs) || isNaN(endTs)) {
      toast({
        title: "⚠️ Invalid Time",
        description: "Start and End times must be valid dates.",
        variant: "destructive",
      });
      return;
    }
    if (endTs <= startTs) {
      toast({
        title: "⚠️ Invalid Time Range",
        description: "End time must be later than the Start time. The task was not registered.",
        variant: "destructive",
      });
      return;
    }
    
    // datetime-local gives naive local wall-clock time (no timezone offset).
    // Convert to a timezone-aware ISO string (with the browser's offset) so the
    // server stores the correct absolute instant and tasks don't instantly
    // become "missed" due to timezone mismatch.
    const start = new Date(newTask.startTime);
    const end = new Date(newTask.endTime);

    const title = newTask.title.trim() || (hasVoice ? "Voice Task" : "");
    const description = newTask.description.trim() || (hasVoice ? "Task created from a voice instruction." : "");

    const taskData = {
      title,
      description,
      assignedToId: newTask.assignedToId,
      assignedToName: newTask.assignedToName,
      assignedToEmail: newTask.assignedToEmail,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      priority: newTask.priority,
      estimatedHours: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) : null,
      voiceNote: newTask.voiceNote || null,
      repeat: newTask.repeat || "",
    };
    
    createMutation.mutate(taskData);
  };

  // Handle start task - records the exact start moment as actual start time
  const handleStartTask = (taskId: string) => {
    const now = new Date().toISOString();
    updateMutation.mutate({ 
      id: taskId, 
      data: { 
        status: "in-progress",
        actualStartTime: now
      } 
    });
    toast({ 
      title: "▶️ Task Started", 
      description: `Started at ${format(new Date(now), "hh:mm a")}. Time registered.` 
    });
  };

  // Handle complete task - records the exact end moment, then confirms
  const handleCompleteTask = (taskId: string, endTime: string) => {
    updateMutation.mutate({ 
      id: taskId, 
      data: { 
        status: "completed",
        actualCompletedTime: endTime,
        completedAt: endTime
      } 
    });
    toast({ 
      title: "🎉 Task Completed!", 
      description: `Finished at ${format(new Date(endTime), "hh:mm a")}. Time registered.` 
    });
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

  const handlePermissionToggle = async (userId: string, currentPermissions: any) => {
    try {
      const currentPermission = hasCanAssignPermission(currentPermissions);
      const newPermission = !currentPermission;
      const permissions = withCanAssignPermission(currentPermissions, newPermission);
      await updateUserPermission(userId, permissions);
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
      voiceNote: "",
      repeat: "",
    });
    setSelectedTemplate("");
    setShowTemplateDropdown(false);
    setTemplateSearch("");
  };

  // Request microphone permission in the same click gesture that opens the
  // drawer, so the browser always shows its permission prompt right away.
  const requestMicPermissionEarly = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // Ignored here; the VoiceRecorder inside the drawer shows denial guidance.
    }
  }, []);

  const handleOpenCreateDrawer = () => {
    requestMicPermissionEarly();
    setIsCreateDrawerOpen(true);
    setSelectedUserError(false);
  };

  // Task Card Component with minimized design
  const TaskCard = ({ task }: { task: Task }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [notes, setNotes] = useState(getNoteText(task.notes));
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const voiceNote = getNoteVoice(task.notes);
    
    const startDate = new Date(task.startTime);
    const endDate = new Date(task.endTime);
    const canUpdate = isAdmin || task.assignedTo.email === currentUser?.email;
    const isMissed = task.status === "missed";
    const endPassed = nowTs > endDate.getTime();
    
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
      const voice = getNoteVoice(task.notes);
      const payload: any = voice ? { voice, text: notes } : notes;
      await updateMutation.mutateAsync({ id: task._id, data: { notes: payload } });
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
                  {isMissed && (
                    <span className="text-[10px] text-red-500 font-medium">
                      {endPassed ? `Ended ${format(endDate, "hh:mm a")}` : "Time window passed"}
                    </span>
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

                      {/* Voice Instruction */}
                      {voiceNote ? (
                        <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-1.5">
                          <div className="flex items-center gap-1 mb-1 text-[10px] font-medium text-blue-600">
                            <Volume2 className="h-3 w-3" />
                            Voice Instruction
                          </div>
                          <audio controls src={voiceNote} className="h-9 w-full" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mb-2 text-[10px] font-medium text-gray-400">
                          <Mic className="h-3 w-3" />
                          No voice instruction
                        </div>
                      )}
                      
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
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => { setNotes(getNoteText(task.notes)); setIsEditingNotes(false); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1">
                            {getNoteText(task.notes) ? (
                              <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded text-xs">
                                {getNoteText(task.notes)}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No notes</p>
                            )}
                            {canUpdate && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs mt-0.5 px-1" onClick={() => setIsEditingNotes(true)}>
                                <Edit3 className="h-2.5 w-2.5 mr-0.5" />
                                {getNoteText(task.notes) || voiceNote ? "Edit" : "Add"}
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
                        title="Start task (your start time will be registered)"
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
                        onClick={() => handleCompleteTask(task._id, new Date().toISOString())} 
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
              onClick={handleOpenCreateDrawer} 
              className="gap-1.5 text-sm h-9 px-3 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign Task
            </Button>
          )}
        </div>
        
        {/* Stats Cards - Minimized, no icons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
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
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-2 sm:p-3">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Missed</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{stats.missed}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search Bar - Responsive */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-wrap items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5 text-gray-400" />
              <Input
                type="date"
                value={rangeFrom.slice(0, 10)}
                onChange={(e) => {
                  if (e.target.value) setRangeFrom(dayStart(new Date(`${e.target.value}T00:00:00`)));
                }}
                className="h-9 text-sm w-auto min-w-[140px]"
                title="From date"
              />
              <span className="text-xs text-gray-500">to</span>
              <Input
                type="date"
                value={rangeTo.slice(0, 10)}
                onChange={(e) => {
                  if (e.target.value) setRangeTo(dayEnd(new Date(`${e.target.value}T23:59:59`)));
                }}
                className="h-9 text-sm w-auto min-w-[140px]"
                title="To date"
              />
              <span className="text-[10px] text-gray-400">
                Loading up to {taskLimit} tasks in range
              </span>
            </div>
          </div>
          </CardContent>
        </Card>
        
        {/* Task Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 max-w-2xl h-9 text-sm">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
            <TabsTrigger value="in-progress" className="text-xs sm:text-sm">Progress</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
            <TabsTrigger value="missed" className="text-xs sm:text-sm">Missed</TabsTrigger>
            {canAssignTasks && (
              <TabsTrigger value="report" className="text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 mr-0.5" />Report
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-3">
            {activeTab === "report" && canAssignTasks ? (
              <TaskReport allUsers={allUsers || []} />
            ) : isLoadingTasks ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <ListTodo className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No tasks found</p>
                  {canAssignTasks && (
                    <Button variant="outline" size="sm" className="mt-3 text-sm" onClick={handleOpenCreateDrawer}>
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
                {hasMoreTasks && (
                  <div className="flex justify-center pt-1">
                    <Button variant="outline" size="sm" onClick={() => setTaskLimit((l) => l + 200)} className="gap-1.5 text-sm">
                      <RefreshCw className="h-3 w-3" />Load More
                    </Button>
                  </div>
                )}
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
              <Label className="text-sm font-semibold">Task Title {newTask.voiceNote ? <span className="text-gray-400">(optional — voice provided)</span> : <span className="text-red-500">*</span>}</Label>
              <p className="text-xs text-gray-400">Pick a template below or type your own title</p>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      id="task-title-input"
                      placeholder={customTitleMode ? "Type your custom title..." : "Type task title or select from templates..."}
                      value={newTask.title}
                      onChange={(e) => {
                        setNewTask({ ...newTask, title: e.target.value });
                        setSelectedTemplate("");
                        if (customTitleMode) {
                          setShowTemplateDropdown(false);
                          return;
                        }
                        if (e.target.value) {
                          setShowTemplateDropdown(true);
                          setTemplateSearch(e.target.value);
                        } else {
                          setShowTemplateDropdown(false);
                        }
                      }}
                      onFocus={() => {
                        if (ALL_TEMPLATE_TASKS.length > 0 && !customTitleMode) {
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
                        setCustomTitleMode(true);
                        setShowTemplateDropdown(false);
                        setTimeout(() => {
                          document.getElementById("task-title-input")?.focus();
                        }, 50);
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
                      <button
                        type="button"
                        onClick={() => {
                          setNewTask({ ...newTask, title: "" });
                          setSelectedTemplate("");
                          setShowTemplateDropdown(false);
                          setTemplateSearch("");
                          setCustomTitleMode(true);
                          setTimeout(() => {
                            document.getElementById("task-title-input")?.focus();
                          }, 50);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b flex items-center gap-2 ${customTitleMode ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                      >
                        <Edit3 className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Type your own title</span>
                      </button>
                      {templateSearch && filteredTemplates.length > 0 && (
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
                        <div className="p-2 text-center">
                          <p className="text-sm text-gray-500">Keep typing to create your own task title</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {selectedTemplate && (
                <p className="text-xs text-green-600">✓ Using template: {selectedTemplate}</p>
              )}
              {customTitleMode && (
                <p className="text-xs text-blue-600">✓ Custom mode — type the title and description below</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Description {newTask.voiceNote ? <span className="text-gray-400">(optional — voice provided)</span> : <span className="text-red-500">*</span>}</Label>
              <Textarea
                placeholder="Detailed description of the task"
                rows={4}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="text-sm resize-none"
              />
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <Mic className="h-3 w-3" />
                Or record a voice instruction instead of title & description (max 2 min)
              </div>
              <VoiceRecorder onChange={(dataUrl) => setNewTask({ ...newTask, voiceNote: dataUrl || "" })} />
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

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Repeat</Label>
              <Select value={newTask.repeat || "none"} onValueChange={(value: any) => setNewTask({ ...newTask, repeat: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="No repetition (once)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Once (no repeat)</SelectItem>
                  <SelectItem value="3">Every day for 3 days</SelectItem>
                  <SelectItem value="7">Every day for 1 week (7 days)</SelectItem>
                  <SelectItem value="10">Every day for 10 days</SelectItem>
                  <SelectItem value="30">Every day for 1 month (30 days)</SelectItem>
                </SelectContent>
              </Select>
              {newTask.repeat && (
                <p className="text-[11px] text-gray-400">
                  The task will be created daily for {newTask.repeat} days at the same start/end time.
                </p>
              )}
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
                      checked={hasCanAssignPermission(user.permissions)}
                      onCheckedChange={() => handlePermissionToggle(user._id, user.permissions)}
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

