"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  ListChecks,
  X,
  FolderTree,
  FileText,
  CheckSquare,
  Calendar,
  AlertTriangle,
  Award,
  Scale,
  ClipboardList,
  BookOpen,
  LayoutGrid,
  FileCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Standard, StandardItem, StandardSubItem, departmentOptions, generateId, DepartmentRole } from "@/types/standards";

export default function StandardsRegisterPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role?.toString().toUpperCase() === "ADMIN";
  
  // Step 1: Role Selection
  const [step, setStep] = useState<"role" | "standards">("role");
  const [selectedRole, setSelectedRole] = useState<DepartmentRole | null>(null);
  const [editingExistingId, setEditingExistingId] = useState<string | null>(null);
  
  // Standards data
  const [standards, setStandards] = useState<StandardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingStandardId, setDeletingStandardId] = useState<string | null>(null);
  const [existingStandards, setExistingStandards] = useState<Standard[]>([]);
  const [description, setDescription] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  
  // Dialog states
  const [showStandardDialog, setShowStandardDialog] = useState(false);
  const [editingStandardItem, setEditingStandardItem] = useState<StandardItem | null>(null);
  const [standardForm, setStandardForm] = useState({ number: "", title: "", description: "", category: "" });
  
  const [showSubItemDialog, setShowSubItemDialog] = useState(false);
  const [editingSubItem, setEditingSubItem] = useState<{ standardId: string; subItem: StandardSubItem | null } | null>(null);
  const [subItemForm, setSubItemForm] = useState({ 
    number: "", 
    title: "", 
    description: "", 
    isRequired: true, 
    checklist: [""],
    penalty: "",
    points: 0
  });

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
    // Check if standards already exist for this role
    const existing = existingStandards.find(s => s.role === role);
    if (existing) {
      // If exists, ask if user wants to edit
      if (confirm(`Standards already exist for ${departmentOptions.find(d => d.value === role)?.label}. Do you want to edit them?`)) {
        loadExistingStandard(existing);
      }
      return;
    }
    // Create new
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

  const handleAddStandard = () => {
    const nextNumber = standards.length + 1;
    const standardNumber = `${selectedRole?.toUpperCase().substring(0, 3)}-${nextNumber.toString().padStart(2, '0')}`;
    
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
      description: "", 
      isRequired: true, 
      checklist: [""],
      penalty: "",
      points: 0
    });
    setShowSubItemDialog(true);
  };

  const handleEditSubItem = (standardId: string, subItem: StandardSubItem) => {
    setEditingSubItem({ standardId, subItem });
    setSubItemForm({
      number: subItem.number,
      title: subItem.title,
      description: subItem.description,
      isRequired: subItem.isRequired,
      checklist: subItem.checklist?.length ? subItem.checklist : [""],
      penalty: subItem.penalty || "",
      points: subItem.points || 0,
    });
    setShowSubItemDialog(true);
  };

  const handleSaveSubItem = () => {
    if (!subItemForm.title) {
      toast.error("Regulation title is required");
      return;
    }

    const checklist = subItemForm.checklist.filter(item => item.trim());
    const newSubItem: StandardSubItem = {
      id: editingSubItem?.subItem?.id || generateId(),
      number: subItemForm.number,
      title: subItemForm.title,
      description: subItemForm.description,
      isRequired: subItemForm.isRequired,
      checklist: checklist.length ? checklist : undefined,
      penalty: subItemForm.penalty || undefined,
      points: subItemForm.points || undefined,
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

  const handleAddChecklistItem = () => {
    setSubItemForm(prev => ({
      ...prev,
      checklist: [...(prev.checklist || []), ""]
    }));
  };

  const handleUpdateChecklistItem = (index: number, value: string) => {
    setSubItemForm(prev => ({
      ...prev,
      checklist: prev.checklist?.map((item, i) => i === index ? value : item)
    }));
  };

  const handleRemoveChecklistItem = (index: number) => {
    setSubItemForm(prev => ({
      ...prev,
      checklist: prev.checklist?.filter((_, i) => i !== index)
    }));
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

  // Role Selection Step
  if (step === "role") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto p-4 md:p-6 max-w-6xl">
          <Toaster position="top-right" />
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mb-4 shadow-xl">
              <Scale className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              Standards & Regulations
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Select a department to create or manage compliance standards
            </p>
          </div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departmentOptions.map((dept) => {
              const existing = existingStandards.find(s => s.role === dept.value);
              return (
                <motion.div
                  key={dept.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  className="cursor-pointer"
                  onClick={() => handleRoleSelect(dept.value as DepartmentRole)}
                >
                  <Card className={`overflow-hidden border-2 transition-all hover:shadow-xl ${
                    existing ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-gray-200 hover:border-purple-300'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-4xl">{dept.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{dept.label}</h3>
                          <p className="text-xs text-muted-foreground">{dept.value}</p>
                        </div>
                        {existing && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {existing.standards.length} Standards
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{dept.description}</p>
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
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <FileCheck className="h-6 w-6" />
                Recently Created Standards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {existingStandards.slice(0, 4).map((standard) => {
                  const dept = departmentOptions.find(d => d.value === standard.role);
                  return (
                    <Card 
                      key={standard._id} 
                      className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => loadExistingStandard(standard)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{dept?.icon}</span>
                            <div>
                              <p className="font-semibold">{standard.roleDisplayName}</p>
                              <p className="text-xs text-muted-foreground">
                                {standard.standards.length} Standards • 
                                {standard.standards.reduce((acc, s) => acc + s.subItems.length, 0)} Regulations
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge>v{standard.version}</Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExistingSet(standard._id!, standard.roleDisplayName);
                              }}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standards Creation/Edit Step - Paper/Board Layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <Toaster position="top-right" />
        
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBackToRole} className="mb-4">
            ← Back to Departments
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{currentDepartment?.icon}</span>
                <div>
                  <h1 className="text-3xl font-bold">
                    {editingExistingId ? 'Edit' : 'Create'} {currentDepartment?.label} Standards
                  </h1>
                  <p className="text-muted-foreground">{currentDepartment?.description}</p>
                </div>
              </div>
              {editingExistingId && (
                <Badge className="mt-2 bg-blue-100 text-blue-800">
                  <Edit className="h-3 w-3 mr-1" />
                  Editing Mode - Update existing standards
                </Badge>
              )}
            </div>
            <Button onClick={handleAddStandard} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Standard
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Standards Board (Paper Layout) */}
          <div className="lg:col-span-2 space-y-4">
            {standards.length === 0 ? (
              <Card className="p-12 text-center border-2 border-dashed">
                <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Standards Created Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Add Standard" to create your first standard for {currentDepartment?.label}
                </p>
                <Button onClick={handleAddStandard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Standard
                </Button>
              </Card>
            ) : (
              <AnimatePresence>
                {standards.map((standard, idx) => (
                  <motion.div
                    key={standard.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                  >
                    <Card className="overflow-hidden border-l-8 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow">
                      {/* Standard Header */}
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <Badge className="bg-purple-600 text-white px-3 py-1">
                                Standard {standard.number}
                              </Badge>
                              {standard.category && (
                                <Badge variant="outline">{standard.category}</Badge>
                              )}
                            </div>
                            <CardTitle className="text-xl mb-1">{standard.title}</CardTitle>
                            {standard.description && (
                              <CardDescription>{standard.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditStandard(standard)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteStandard(standard.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4">
                        {/* Regulations List */}
                        {standard.subItems.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <CheckSquare className="h-4 w-4" />
                              Regulations ({standard.subItems.length}):
                            </div>
                            {standard.subItems.map((subItem) => (
                              <div
                                key={subItem.id}
                                className="pl-4 border-l-2 border-purple-200 hover:border-purple-400 transition-colors"
                              >
                                <div className="flex justify-between items-start group">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <Badge variant="outline" className="text-xs">
                                        {subItem.number}
                                      </Badge>
                                      <span className="font-medium">{subItem.title}</span>
                                      {subItem.isRequired ? (
                                        <Badge className="bg-red-100 text-red-800 text-xs">Mandatory</Badge>
                                      ) : (
                                        <Badge className="bg-green-100 text-green-800 text-xs">Advisory</Badge>
                                      )}
                                      {subItem.points && subItem.points > 0 && (
                                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                                          <Award className="h-3 w-3 mr-1 inline" />
                                          {subItem.points} pts
                                        </Badge>
                                      )}
                                      {subItem.penalty && (
                                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                                          Penalty: {subItem.penalty}
                                        </Badge>
                                      )}
                                    </div>
                                    {subItem.description && (
                                      <p className="text-sm text-muted-foreground mb-2">{subItem.description}</p>
                                    )}
                                    {subItem.checklist && subItem.checklist.length > 0 && (
                                      <div className="ml-4 mt-2 space-y-1">
                                        {subItem.checklist.map((item, i) => (
                                          <div key={i} className="flex items-center gap-2 text-sm">
                                            <div className="w-4 h-4 rounded border-2 border-gray-300" />
                                            <span>{item}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditSubItem(standard.id, subItem)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSubItem(standard.id, subItem.id)}>
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No regulations added yet</p>
                          </div>
                        )}

                        {/* Add Regulation Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSubItem(standard.id)}
                          className="mt-4 w-full border-dashed"
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          Add Regulation
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Right Column - Settings & Info */}
          <div className="space-y-6">
            {/* Standards Info Card */}
            <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ClipboardList className="h-5 w-5" />
                  Standards Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Standards:</span>
                    <span className="font-bold text-xl">{standards.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Regulations:</span>
                    <span className="font-bold text-xl">
                      {standards.reduce((acc, s) => acc + s.subItems.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mandatory Rules:</span>
                    <span className="font-bold text-xl">
                      {standards.reduce((acc, s) => 
                        acc + s.subItems.filter(si => si.isRequired).length, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Standards Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
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
                  />
                </div>
                <div>
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Review Date</Label>
                  <Input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Guidelines Card */}
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-5 w-5" />
                  Compliance Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Mandatory regulations must be followed at all times</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Award className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span>Points awarded for compliance with standards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <span>Penalties apply for violation of mandatory rules</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
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
        </div>

        {/* Standard Dialog */}
        <Dialog open={showStandardDialog} onOpenChange={setShowStandardDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStandardItem ? "Edit Standard" : "Add New Standard"}</DialogTitle>
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
                  placeholder="e.g., POS-01"
                  readOnly={!editingStandardItem}
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-generated, can be edited</p>
              </div>
              <div>
                <Label>Title *</Label>
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
              <div className="flex gap-3">
                <Button onClick={handleSaveStandard} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setShowStandardDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Regulation Dialog */}
        <Dialog open={showSubItemDialog} onOpenChange={setShowSubItemDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSubItem?.subItem ? "Edit Regulation" : "Add New Regulation"}</DialogTitle>
              <DialogDescription>
                Add specific rules, requirements, or compliance checkpoints
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Regulation Number</Label>
                <Input
                  value={subItemForm.number}
                  onChange={(e) => setSubItemForm(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="e.g., POS-01.1"
                />
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={subItemForm.title}
                  onChange={(e) => setSubItemForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Daily Cash Count Must Match System Records"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={subItemForm.description}
                  onChange={(e) => setSubItemForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed explanation of the regulation"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Compliance Points
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={subItemForm.points}
                    onChange={(e) => setSubItemForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    placeholder="e.g., 10"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Penalty for Violation
                  </Label>
                  <Input
                    value={subItemForm.penalty}
                    onChange={(e) => setSubItemForm(prev => ({ ...prev, penalty: e.target.value }))}
                    placeholder="e.g., Written warning, Fine 100 ETB"
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Compliance Checklist
                </Label>
                <div className="space-y-2 mt-2">
                  {subItemForm.checklist?.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => handleUpdateChecklistItem(idx, e.target.value)}
                        placeholder={`Checklist item ${idx + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddChecklistItem} className="w-full">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Checklist Item
                  </Button>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Requirement Type
                </Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={subItemForm.isRequired}
                      onChange={() => setSubItemForm(prev => ({ ...prev, isRequired: true }))}
                    />
                    <span>Mandatory (Must be followed, with penalties)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!subItemForm.isRequired}
                      onChange={() => setSubItemForm(prev => ({ ...prev, isRequired: false }))}
                    />
                    <span>Advisory (Recommended best practice)</span>
                  </label>
                </div>
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
