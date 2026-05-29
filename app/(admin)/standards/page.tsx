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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scale,
  CheckCircle,
  XCircle,
  ListChecks,
  FolderTree,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  AlertCircle,
  Award,
  AlertTriangle,
  Calendar,
  Hash,
  FileText,
  DollarSign,
  ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Standard, StandardItem, StandardSubItem, departmentOptions } from "@/types/standards";

export default function StandardsDisplayPage() {
  const { data: session } = useSession();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [filteredStandards, setFilteredStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [expandedStandards, setExpandedStandards] = useState<Record<string, boolean>>({});
  const [expandedRegulations, setExpandedRegulations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchStandards();
  }, []);

  useEffect(() => {
    filterStandards();
  }, [searchTerm, selectedRole, standards]);

  const fetchStandards = async () => {
    try {
      const response = await fetch("/api/standards?all=true");
      const data = await response.json();
      
      if (data.success) {
        setStandards(data.standards || []);
        setFilteredStandards(data.standards || []);
      } else {
        toast.error("Failed to fetch standards");
      }
    } catch (error) {
      console.error("Error fetching standards:", error);
      toast.error("Error loading standards");
    } finally {
      setLoading(false);
    }
  };

  const filterStandards = () => {
    let filtered = [...standards];

    if (searchTerm) {
      filtered = filtered.filter(
        (standard) =>
          standard.roleDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          standard.standards.some((s) =>
            s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          standard.standards.some((s) =>
            s.subItems.some((si) =>
              si.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              si.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
          )
      );
    }

    if (selectedRole !== "all") {
      filtered = filtered.filter((standard) => standard.role === selectedRole);
    }

    setFilteredStandards(filtered);
  };

  const toggleStandard = (standardId: string) => {
    setExpandedStandards(prev => ({ ...prev, [standardId]: !prev[standardId] }));
  };

  const toggleRegulation = (regulationId: string) => {
    setExpandedRegulations(prev => ({ ...prev, [regulationId]: !prev[regulationId] }));
  };

  const getDepartmentDetails = (role: string) => {
    return departmentOptions.find(d => d.value === role);
  };

  const RegulationCard = ({ subItem }: { subItem: StandardSubItem }) => {
    const isExpanded = expandedRegulations[subItem.id] || false;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-3">
        {/* Regulation Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          onClick={() => toggleRegulation(subItem.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="font-mono">
                <Hash className="h-3 w-3 mr-1" />
                {subItem.number}
              </Badge>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {subItem.title}
              </span>
              {subItem.isRequired ? (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Mandatory
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Advisory
                </Badge>
              )}
              {subItem.points && subItem.points > 0 && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Award className="h-3 w-3 mr-1" />
                  {subItem.points} Points
                </Badge>
              )}
            </div>
            <div className="text-gray-400">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>
        </div>

        {/* Regulation Details - Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
                {/* Description */}
                {subItem.description && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <FileText className="h-4 w-4" />
                      Description
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 pl-6">
                      {subItem.description}
                    </p>
                  </div>
                )}

                {/* Penalty */}
                {subItem.penalty && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      Penalty for Violation
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 pl-6">
                      {subItem.penalty}
                    </p>
                  </div>
                )}

                {/* Points */}
                {subItem.points && subItem.points > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                      <Award className="h-4 w-4" />
                      Compliance Points
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 pl-6">
                      {subItem.points} points for compliance
                    </p>
                  </div>
                )}

                {/* Checklist */}
                {subItem.checklist && subItem.checklist.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <CheckSquare className="h-4 w-4" />
                      Compliance Checklist
                    </div>
                    <div className="pl-6 space-y-2">
                      {subItem.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-4 h-4 mt-0.5 rounded border-2 border-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirement Type Badge */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <AlertCircle className="h-4 w-4" />
                    Requirement Type
                  </div>
                  <div className="pl-6">
                    {subItem.isRequired ? (
                      <Badge className="bg-red-100 text-red-800">
                        Mandatory - Must be followed at all times
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">
                        Advisory - Recommended best practice
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const StandardCard = ({ standard }: { standard: Standard }) => {
    const isExpanded = expandedStandards[standard._id!] || false;
    const deptDetails = getDepartmentDetails(standard.role);
    const totalRegulations = standard.standards.reduce((acc, s) => acc + s.subItems.length, 0);
    const mandatoryCount = standard.standards.reduce((acc, s) => 
      acc + s.subItems.filter(si => si.isRequired).length, 0);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
          {/* Header */}
          <div className={`p-6 ${deptDetails?.color} bg-opacity-20 border-b`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">{deptDetails?.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold">{standard.roleDisplayName}</h2>
                    <p className="text-sm text-muted-foreground">{deptDetails?.description}</p>
                  </div>
                  <Badge className={deptDetails?.color}>
                    v{standard.version}
                  </Badge>
                </div>
                {standard.description && (
                  <p className="text-muted-foreground text-sm mt-2">{standard.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleStandard(standard._id!)}
                className="shrink-0"
              >
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1">
                <FolderTree className="h-4 w-4" />
                {standard.standards.length} Standards
              </span>
              <span className="flex items-center gap-1">
                <CheckSquare className="h-4 w-4" />
                {totalRegulations} Regulations ({mandatoryCount} Mandatory)
              </span>
              {standard.effectiveFrom && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Effective: {new Date(standard.effectiveFrom).toLocaleDateString()}
                </span>
              )}
              {standard.reviewDate && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Review: {new Date(standard.reviewDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CardContent className="p-6">
                  {standard.standards.map((item: StandardItem) => (
                    <div key={item.id} className="mb-8 last:mb-0">
                      {/* Standard Item Header */}
                      <div className="mb-4 pb-2 border-b-2 border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-purple-600 text-white px-3 py-1">
                            {item.number}
                          </Badge>
                          <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">
                            {item.title}
                          </h3>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-2 ml-12">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Regulations List */}
                      {item.subItems.length > 0 ? (
                        <div className="ml-4 space-y-3">
                          <p className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <ClipboardList className="h-4 w-4" />
                            Regulations:
                          </p>
                          {item.subItems.map((subItem) => (
                            <RegulationCard key={subItem.id} subItem={subItem} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <p className="text-sm">No regulations added for this standard</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Scale className="h-12 w-12 mx-auto mb-4 text-purple-600" />
          </motion.div>
          <p className="text-lg">Loading standards...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-4 md:p-6">
        <Toaster position="top-right" />

        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full mb-4 shadow-lg">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Standards & Regulations
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Departmental rules, compliance standards, and operational regulations
          </p>
        </div>

        {/* Search and Filter */}
        <Card className="mb-8 shadow-md border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by department, standard, or regulation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="md:w-[250px]">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments ({standards.length})</SelectItem>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      <div className="flex items-center gap-2">
                        <span>{dept.icon}</span>
                        <span>{dept.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchStandards}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center shadow-sm border-0">
            <CardContent className="p-4">
              <ListChecks className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{standards.length}</p>
              <p className="text-xs text-muted-foreground">Departments</p>
            </CardContent>
          </Card>
          <Card className="text-center shadow-sm border-0">
            <CardContent className="p-4">
              <FolderTree className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">
                {standards.reduce((acc, s) => acc + s.standards.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Standards</p>
            </CardContent>
          </Card>
          <Card className="text-center shadow-sm border-0">
            <CardContent className="p-4">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">
                {standards.reduce((acc, s) => 
                  acc + s.standards.reduce((a, st) => a + st.subItems.length, 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Regulations</p>
            </CardContent>
          </Card>
          <Card className="text-center shadow-sm border-0">
            <CardContent className="p-4">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">
                {standards.reduce((acc, s) => 
                  acc + s.standards.reduce((a, st) => 
                    a + st.subItems.filter(si => si.isRequired).length, 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Mandatory Rules</p>
            </CardContent>
          </Card>
        </div>

        {/* Standards Display */}
        {filteredStandards.length === 0 ? (
          <Card className="p-12 text-center border-0 shadow-md">
            <Scale className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No standards found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedRole !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Start by creating standards for different departments"}
            </p>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {filteredStandards.map((standard) => (
                <StandardCard key={standard._id} standard={standard} />
              ))}
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center text-sm text-muted-foreground border-t pt-6">
              <p>Showing {filteredStandards.length} of {standards.length} department standards</p>
              <p className="mt-1 text-xs">📋 Click on any standard to view details</p>
              <p className="mt-1 text-xs">📝 Click on any regulation to expand and see full details</p>
              <p className="mt-1 text-xs">⚠️ Mandatory regulations must be followed at all times</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
