"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast, Toaster } from "react-hot-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Scale,
  ClipboardList,
  FileCheck,
  Hash,
  Calendar,
  FolderTree,
  FileText,
  X,
  ChevronRight,
  Users,
  Building2,
  Utensils,
  ShoppingCart,
  DollarSign,
  Wrench,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Standard, StandardItem, StandardSubItem, departmentOptions, generateId, DepartmentRole } from "@/types/standards";

// Department icons mapping
const departmentIcons: Record<string, JSX.Element> = {
  kitchen: <Utensils className="h-6 w-6" />,
  service: <Users className="h-6 w-6" />,
  bar: <ShoppingCart className="h-6 w-6" />,
  cashier: <DollarSign className="h-6 w-6" />,
  maintenance: <Wrench className="h-6 w-6" />,
  hr: <Heart className="h-6 w-6" />,
  default: <Building2 className="h-6 w-6" />,
};

const departmentColors: Record<string, string> = {
  kitchen: "from-orange-500 to-red-500",
  service: "from-blue-500 to-cyan-500",
  bar: "from-purple-500 to-pink-500",
  cashier: "from-green-500 to-emerald-500",
  maintenance: "from-yellow-500 to-amber-500",
  hr: "from-indigo-500 to-purple-500",
  default: "from-gray-500 to-slate-500",
};

// Function to generate standard number with "STANDARD" text between prefix and number
const generateStandardNumber = (role: DepartmentRole | null, index: number) => {
  const prefix = role?.toUpperCase().substring(0, 3) || "DEP";
  return `${prefix}-STANDARD-${index.toString().padStart(2, '0')}`;
};

export default function StandardsRegisterPage() {
  const { data: session } = useSession();
  
  // Step management
  const [step, setStep] = useState<"role" | "standards">("role");
  const [selectedRole, setSelectedRole] = useState<DepartmentRole | null>(null);
  const [editingExistingId, setEditingExistingId] = useState<string | null>(null);
  
  // Standards data
  const [standards, setStandards] = useState<StandardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingStandards, setExistingStandards] = useState<Standard[]>([]);
  const [description, setDescription] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  
  // Dialog states
  const [showStandardDialog, setShowStandardDialog] = useState(false);
  const [editingStandardItem, setEditingStandardItem] = useState<StandardItem | null>(null);
  const [standardForm, setStandardForm] = useState({ 
    number: "", 
    title: "", 
    description: "", 
    category: ""
  });
  
  const [showSubItemDialog, setShowSubItemDialog] = useState(false);
  const [editingSubItem, setEditingSubItem] = useState<{ standardId: string; subItem: StandardSubItem | null } | null>(null);
  const [subItemForm, setSubItemForm] = useState({ 
    number: "", 
    title: "", 
    description: ""
  });

  // Expand/collapse states for standards - ALL EXPANDED BY DEFAULT
  const [expandedStandards, setExpandedStandards] = useState<Set<string>>(new Set());

  // Auto-expand all standards when they're loaded/updated
  useEffect(() => {
    const allStandardIds = new Set(standards.map(s => s.id));
    setExpandedStandards(allStandardIds);
  }, [standards]);

  useEffect(() => {
    fetchStandards();
  }, []);

  const fetchStandards = async () => {
    setFetching(true);
    try {
      const response = await fetch("/api/standards?all=true");
      const data = await response.json();
      if (data.success) {
        setExistingStandards(data.standards || []);
      }
    } catch (error) {
      console.error("Error fetching standards:", error);
      toast.error("Failed to fetch standards");
    } finally {
      setFetching(false);
    }
  };

  const handleRoleSelect = (role: DepartmentRole) => {
    const existing = existingStandards.find(s => s.role === role);
    if (existing) {
      loadExistingStandard(existing);
      return;
    }
    setSelectedRole(role);
    setEditingExistingId(null);
    setStandards([]);
    setDescription("");
    setEffectiveFrom("");
    setReviewDate("");
    setStep("standards");
    toast.success(`Creating new standards for ${departmentOptions.find(d => d.value === role)?.label}`);
  };

  const loadExistingStandard = (standard: Standard) => {
    setSelectedRole(standard.role);
    setEditingExistingId(standard._id!);
    setStandards(standard.standards);
    setDescription(standard.description || "");
    setEffectiveFrom(standard.effectiveFrom ? new Date(standard.effectiveFrom).toISOString().split('T')[0] : "");
    setReviewDate(standard.reviewDate ? new Date(standard.reviewDate).toISOString().split('T')[0] : "");
    setStep("standards");
    toast.success(`Editing existing standards for ${standard.roleDisplayName} (Version ${standard.version})`);
  };

  const handleBackToRole = () => {
    if (standards.length > 0 && !editingExistingId) {
      if (confirm("You have unsaved standards. Are you sure you want to go back?")) {
        resetForm();
        setStep("role");
      }
    } else {
      resetForm();
      setStep("role");
    }
  };

  const resetForm = () => {
    setSelectedRole(null);
    setEditingExistingId(null);
    setStandards([]);
    setDescription("");
    setEffectiveFrom("");
    setReviewDate("");
  };

  const toggleStandardExpand = (standardId: string) => {
    setExpandedStandards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(standardId)) {
        newSet.delete(standardId);
      } else {
        newSet.add(standardId);
      }
      return newSet;
    });
  };

  const handleAddStandard = () => {
    const nextNumber = standards.length + 1;
    const standardNumber = generateStandardNumber(selectedRole, nextNumber);
    
    setEditingStandardItem(null);
    setStandardForm({ 
      number: standardNumber, 
      title: "", 
      description: "", 
      category: "" 
    });
    setShowStandardDialog(true);
  };

  const handleEditStandard = (standard: StandardItem) => {
    setEditingStandardItem(standard);
    setStandardForm({
      number: standard.number,
      title: standard.title,
      description: standard.description,
      category: standard.category || "",
    });
    setShowStandardDialog(true);
  };

  const handleSaveStandard = () => {
    if (!standardForm.title) {
      toast.error("Standard title is required");
      return;
    }

    if (editingStandardItem) {
      setStandards(prev => prev.map(s => 
        s.id === editingStandardItem.id 
          ? { 
              ...s, 
              number: standardForm.number, 
              title: standardForm.title, 
              description: standardForm.description,
              category: standardForm.category 
            }
          : s
      ));
      toast.success("Standard updated");
    } else {
      const newStandard: StandardItem = {
        id: generateId(),
        number: standardForm.number,
        title: standardForm.title,
        description: standardForm.description,
        category: standardForm.category,
        subItems: [],
      };
      setStandards(prev => [...prev, newStandard]);
      toast.success(`Standard "${standardForm.title}" added`);
    }
    setShowStandardDialog(false);
  };

  const handleDeleteStandard = (standardId: string) => {
    if (confirm("Delete this standard and all its regulations?")) {
      setStandards(prev => prev.filter(s => s.id !== standardId));
      toast.success("Standard deleted");
    }
  };

  const handleAddSubItem = (standardId: string) => {
    const standard = standards.find(s => s.id === standardId);
    const nextSubNumber = (standard?.subItems.length || 0) + 1;
    const subNumber = `${standard?.number}.${nextSubNumber}`;
    
    setEditingSubItem({ standardId, subItem: null });
    setSubItemForm({ 
      number: subNumber, 
      title: "", 
      description: ""
    });
    setShowSubItemDialog(true);
  };

  const handleEditSubItem = (standardId: string, subItem: StandardSubItem) => {
    setEditingSubItem({ standardId, subItem });
    setSubItemForm({
      number: subItem.number,
      title: subItem.title,
      description: subItem.description || "",
    });
    setShowSubItemDialog(true);
  };

  const handleSaveSubItem = () => {
    if (!subItemForm.title) {
      toast.error("Regulation title is required");
      return;
    }

    const newSubItem: StandardSubItem = {
      id: editingSubItem?.subItem?.id || generateId(),
      number: subItemForm.number,
      title: subItemForm.title,
      description: subItemForm.description,
      isRequired: true,
    };

    setStandards(prev => prev.map(standard => {
      if (standard.id === editingSubItem?.standardId) {
        if (editingSubItem?.subItem) {
          return {
            ...standard,
            subItems: standard.subItems.map(si => si.id === newSubItem.id ? newSubItem : si)
          };
        } else {
          return {
            ...standard,
            subItems: [...standard.subItems, newSubItem]
          };
        }
      }
      return standard;
    }));

    toast.success(editingSubItem?.subItem ? "Regulation updated" : "Regulation added");
    setShowSubItemDialog(false);
  };

  const handleDeleteSubItem = (standardId: string, subItemId: string) => {
    if (confirm("Delete this regulation?")) {
      setStandards(prev => prev.map(standard => {
        if (standard.id === standardId) {
          return {
            ...standard,
            subItems: standard.subItems.filter(si => si.id !== subItemId)
          };
        }
        return standard;
      }));
      toast.success("Regulation deleted");
    }
  };

  const handleSubmit = async () => {
    if (!selectedRole) {
      toast.error("Please select a department");
      return;
    }

    if (standards.length === 0) {
      toast.error("At least one standard is required");
      return;
    }

    setLoading(true);
    try {
      const url = editingExistingId ? `/api/standards?id=${editingExistingId}` : "/api/standards";
      const method = editingExistingId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          standards: standards,
          description: description,
          effectiveFrom: effectiveFrom || undefined,
          reviewDate: reviewDate || undefined,
          standardId: editingExistingId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save standards");
      }

      toast.success(editingExistingId ? "Standards updated successfully!" : "Standards created successfully!");
      resetForm();
      await fetchStandards();
      setStep("role");
      
    } catch (error: any) {
      console.error("Error saving standards:", error);
      toast.error(error.message || "Failed to save standards");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExistingSet = async (id: string, roleName: string) => {
    if (confirm(`Delete all standards for ${roleName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/standards?id=${id}`, {
          method: "DELETE",
        });
        const data = await response.json();
        if (data.success) {
          toast.success(`Standards for ${roleName} deleted successfully`);
          await fetchStandards();
          if (editingExistingId === id) {
            resetForm();
            setStep("role");
          }
        } else {
          toast.error("Failed to delete standards");
        }
      } catch (error) {
        console.error("Error deleting standards:", error);
        toast.error("Error deleting standards");
      }
    }
  };

  const getDepartmentDetails = (role: DepartmentRole | null) => {
    return departmentOptions.find(d => d.value === role);
  };

  const currentDepartment = getDepartmentDetails(selectedRole);
  const departmentColor = selectedRole ? departmentColors[selectedRole] || departmentColors.default : departmentColors.default;
  const DepartmentIcon = selectedRole ? departmentIcons[selectedRole] || departmentIcons.default : departmentIcons.default;

  const totalRegulations = standards.reduce((acc, s) => acc + s.subItems.length, 0);
  const progress = standards.length > 0 ? (totalRegulations / (standards.length * 3)) * 100 : 0;

  // Role Selection Step
  if (step === "role") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
          <Toaster position="top-right" />
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mb-4 shadow-xl">
              <Scale className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              Standards & Regulations
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
              Select a department to create or manage compliance standards and regulations
            </p>
          </motion.div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departmentOptions.map((dept, index) => {
              const existing = existingStandards.find(s => s.role === dept.value);
              const colorClass = departmentColors[dept.value] || departmentColors.default;
              
              return (
                <motion.div
                  key={dept.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`overflow-hidden border-2 transition-all cursor-pointer hover:shadow-xl ${
                      existing 
                        ? 'border-green-300 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20' 
                        : 'border-gray-200 hover:border-purple-300 bg-white'
                    }`}
                    onClick={() => handleRoleSelect(dept.value as DepartmentRole)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} text-white shadow-lg`}>
                          {departmentIcons[dept.value] || departmentIcons.default}
                        </div>
                        {existing && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {existing.standards.length} Standards
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-bold mb-2">{dept.label}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{dept.description}</p>
                      
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          variant={existing ? "outline" : "default"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleSelect(dept.value as DepartmentRole);
                          }}
                        >
                          {existing ? (
                            <>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Standards
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Standards
                            </>
                          )}
                        </Button>
                        {existing && (
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExistingSet(existing._id!, dept.label);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Existing Standards Section */}
          {existingStandards.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FileCheck className="h-6 w-6 text-purple-600" />
                  Recently Created Standards
                </h2>
                <Button variant="ghost" size="sm" onClick={fetchStandards}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {existingStandards.slice(0, 4).map((standard) => {
                  const dept = departmentOptions.find(d => d.value === standard.role);
                  const colorClass = departmentColors[standard.role] || departmentColors.default;
                  
                  return (
                    <Card 
                      key={standard._id} 
                      className={`border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]`}
                      onClick={() => loadExistingStandard(standard)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClass} text-white`}>
                              {departmentIcons[standard.role] || departmentIcons.default}
                            </div>
                            <div>
                              <p className="font-semibold">{standard.roleDisplayName}</p>
                              <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                <span>{standard.standards.length} Standards</span>
                                <span>•</span>
                                <span>{standard.standards.reduce((acc, s) => acc + s.subItems.length, 0)} Regulations</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">v{standard.version}</Badge>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Standards Creation/Edit Step
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <Toaster position="top-right" />
        
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBackToRole} 
            className="mb-4 hover:bg-white/50"
          >
            ← Back to Departments
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${departmentColor} text-white shadow-lg`}>
                {DepartmentIcon}
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {editingExistingId ? 'Edit' : 'Create'} {currentDepartment?.label} Standards
                </h1>
                <p className="text-gray-500 dark:text-gray-400">{currentDepartment?.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {editingExistingId && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Edit className="h-3 w-3 mr-1" />
                  Editing Mode
                </Badge>
              )}
              <Button 
                onClick={handleAddStandard} 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Standard
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Standards List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {standards.length === 0 ? (
                <Card className="p-12 text-center border-2 border-dashed">
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">No Standards Created Yet</h3>
                  <p className="text-gray-500 mb-4">
                    Click "Add Standard" to create your first standard for {currentDepartment?.label}
                  </p>
                  <Button onClick={handleAddStandard}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Standard
                  </Button>
                </Card>
              ) : (
                <>
                  <AnimatePresence>
                    {standards.map((standard, idx) => (
                      <motion.div
                        key={standard.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <Card className="overflow-hidden border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-all">
                          {/* Standard Header - Clickable to expand/collapse */}
                          <div 
                            className="cursor-pointer"
                            onClick={() => toggleStandardExpand(standard.id)}
                          >
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 pb-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 flex-wrap mb-2">
                                    <Badge className="bg-purple-600 text-white px-3 py-1">
                                      <Hash className="h-3 w-3 inline mr-1" />
                                      {standard.number}
                                    </Badge>
                                    {standard.category && (
                                      <Badge variant="outline">{standard.category}</Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                      {standard.subItems.length} Regulation{standard.subItems.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  <CardTitle className="text-xl mb-1">{standard.title}</CardTitle>
                                  {standard.description && (
                                    <CardDescription>{standard.description}</CardDescription>
                                  )}
                                </div>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" onClick={() => handleEditStandard(standard)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteStandard(standard.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    {expandedStandards.has(standard.id) ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                          </div>

                          {/* Expanded Content - Regulations (Always expanded by default) */}
                          <AnimatePresence initial={false}>
                            {expandedStandards.has(standard.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <CardContent className="pt-4">
                                  {standard.subItems.length > 0 ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                                        <ClipboardList className="h-4 w-4" />
                                        Regulations ({standard.subItems.length}):
                                      </div>
                                      {standard.subItems.map((subItem) => (
                                        <div
                                          key={subItem.id}
                                          className="pl-4 border-l-2 border-purple-200 hover:border-purple-400 transition-colors group"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <Badge variant="outline" className="text-xs">
                                                  {subItem.number}
                                                </Badge>
                                                <span className="font-medium">{subItem.title}</span>
                                              </div>
                                              {subItem.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                  {subItem.description}
                                                </p>
                                              )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleEditSubItem(standard.id, subItem)}
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleDeleteSubItem(standard.id, subItem.id)}
                                              >
                                                <Trash2 className="h-3 w-3 text-red-500" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-gray-500">
                                      <p className="text-sm">No regulations added yet</p>
                                    </div>
                                  )}

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddSubItem(standard.id)}
                                    className="mt-4 w-full border-dashed hover:border-purple-500 hover:text-purple-600"
                                  >
                                    <Plus className="h-3 w-3 mr-2" />
                                    Add Regulation
                                  </Button>
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Save Button - Directly attached to the last card with no gap */}
                  <div className="mt-0">
                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg shadow-lg rounded-t-none rounded-b-lg"
                      onClick={handleSubmit}
                      disabled={loading || standards.length === 0}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          {editingExistingId ? 'Updating...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          {editingExistingId ? 'Update' : 'Publish'} {standards.length} Standard{standards.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Settings & Info */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ClipboardList className="h-5 w-5" />
                  Standards Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Standards:</span>
                    <span className="font-bold text-xl">{standards.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Regulations:</span>
                    <span className="font-bold text-xl">{totalRegulations}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Completion Progress</span>
                    <span>{Math.min(100, Math.round(progress))}%</span>
                  </div>
                  <Progress value={Math.min(100, progress)} className="h-2 bg-white/30" />
                </div>
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Standards Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of these standards..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Review Date</Label>
                  <Input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Guidelines Card */}
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-5 w-5" />
                  Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Create standards by department</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Plus className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>Add regulations to each standard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Review and update regularly</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Standard Dialog */}
        <Dialog open={showStandardDialog} onOpenChange={setShowStandardDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-purple-600" />
                {editingStandardItem ? "Edit Standard" : "Add New Standard"}
              </DialogTitle>
              <DialogDescription>
                Create a main standard category for {currentDepartment?.label}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Standard Number</Label>
                <Input
                  value={standardForm.number}
                  onChange={(e) => setStandardForm(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="e.g., POS-STANDARD-01"
                />
                <p className="text-xs text-gray-500 mt-1">Format: DEPT-STANDARD-01 (Auto-generated, can be edited)</p>
              </div>
              <div>
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input
                  value={standardForm.title}
                  onChange={(e) => setStandardForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Cash Handling Procedures"
                />
              </div>
              <div>
                <Label>Category (Optional)</Label>
                <Input
                  value={standardForm.category}
                  onChange={(e) => setStandardForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Financial, Operational, Safety"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={standardForm.description}
                  onChange={(e) => setStandardForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this standard"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveStandard} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Standard
                </Button>
                <Button variant="outline" onClick={() => setShowStandardDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Regulation Dialog - Simplified without extra fields */}
        <Dialog open={showSubItemDialog} onOpenChange={setShowSubItemDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                {editingSubItem?.subItem ? "Edit Regulation" : "Add New Regulation"}
              </DialogTitle>
              <DialogDescription>
                Add a specific rule or requirement for this standard
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Regulation Number</Label>
                <Input
                  value={subItemForm.number}
                  onChange={(e) => setSubItemForm(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="e.g., POS-STANDARD-01.1"
                />
              </div>
              <div>
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input
                  value={subItemForm.title}
                  onChange={(e) => setSubItemForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Daily Cash Count Must Match System Records"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={subItemForm.description}
                  onChange={(e) => setSubItemForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed explanation of the regulation"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveSubItem} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Regulation
                </Button>
                <Button variant="outline" onClick={() => setShowSubItemDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}