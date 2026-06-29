"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast, Toaster } from "react-hot-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Trash2,
  Edit,
  Image as ImageIcon,
  X,
  Loader2,
  Users,
  Calendar,
  Clock,
  Tag,
  Globe,
  Heart,
  Eye,
  PenTool,
  BookOpen,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Book,
  ChevronRight,
  ChevronLeft,
  Menu,
  Bookmark,
  Crown,
  Star,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface Culture {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export default function CulturePage() {
  const { data: session } = useSession();
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [filteredCultures, setFilteredCultures] = useState<Culture[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCulture, setSelectedCulture] = useState<Culture | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cultureToDelete, setCultureToDelete] = useState<Culture | null>(null);
  
  // Book navigation states
  const [currentPage, setCurrentPage] = useState<"cover" | "toc" | "culture">("cover");
  const [selectedCultureIndex, setSelectedCultureIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isBookOpen, setIsBookOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role?.toString().toUpperCase() === "ADMIN";

  useEffect(() => {
    fetchCultures();
  }, []);

  useEffect(() => {
    filterCultures();
  }, [searchTerm, cultures]);

  const fetchCultures = async () => {
    try {
      const response = await fetch("/api/culture");
      const data = await response.json();
      
      if (data.success) {
        setCultures(data.cultures || []);
        setFilteredCultures(data.cultures || []);
      } else {
        toast.error("Failed to fetch cultures");
      }
    } catch (error) {
      console.error("Error fetching cultures:", error);
      toast.error("Error loading cultures");
    } finally {
      setLoading(false);
    }
  };

  const filterCultures = () => {
    if (!searchTerm.trim()) {
      setFilteredCultures(cultures);
      return;
    }

    const filtered = cultures.filter(
      (culture) =>
        culture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        culture.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCultures(filtered);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageFile(null);
    setImagePreview("");
    setIsEditMode(false);
    setSelectedCulture(null);
    setUploadProgress(0);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`File too large. Max size: ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (isEditMode && selectedCulture) {
        formData.append("id", selectedCulture._id);
        formData.append("isEdit", "true");
      }

      const response = await fetch("/api/culture", {
        method: isEditMode ? "PUT" : "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save culture");
      }

      toast.success(isEditMode ? "Culture updated successfully!" : "Culture created successfully!");
      resetForm();
      setIsDialogOpen(false);
      await fetchCultures();
    } catch (error: any) {
      console.error("Error saving culture:", error);
      toast.error(error.message || "Failed to save culture");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (culture: Culture) => {
    setSelectedCulture(culture);
    setTitle(culture.title);
    setDescription(culture.description);
    setImagePreview(culture.imageUrl || "");
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (culture: Culture) => {
    setCultureToDelete(culture);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!cultureToDelete) return;

    try {
      const response = await fetch(`/api/culture?id=${cultureToDelete._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete culture");
      }

      toast.success("Culture deleted successfully!");
      setDeleteDialogOpen(false);
      setCultureToDelete(null);
      await fetchCultures();
    } catch (error: any) {
      console.error("Error deleting culture:", error);
      toast.error(error.message || "Failed to delete culture");
    }
  };

  const openCulture = (index: number) => {
    setSelectedCultureIndex(index);
    setCurrentPage("culture");
    setIsBookOpen(true);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToCover = () => {
    setCurrentPage("cover");
    setIsBookOpen(false);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToTOC = () => {
    setCurrentPage("toc");
    setIsBookOpen(true);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const nextCulture = () => {
    if (selectedCultureIndex < filteredCultures.length - 1) {
      setSelectedCultureIndex(selectedCultureIndex + 1);
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const prevCulture = () => {
    if (selectedCultureIndex > 0) {
      setSelectedCultureIndex(selectedCultureIndex - 1);
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  // Book Cover Component
  const BookCover = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full"
    >
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 rounded-3xl shadow-2xl overflow-hidden">
        <div className="relative p-8 md:p-12 min-h-[500px] md:min-h-[600px] flex flex-col items-center justify-center text-center">
          {/* Decorative elements */}
          <div className="absolute top-8 right-8 opacity-20">
            <Globe className="h-20 w-20 md:h-24 md:w-24 text-amber-300" />
          </div>
          <div className="absolute bottom-8 left-8 opacity-20">
            <Users className="h-20 w-20 md:h-24 md:w-24 text-amber-300" />
          </div>
          
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-24 md:w-32 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-24 md:w-32 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

          <div className="space-y-4 md:space-y-6">
            <div className="flex justify-center">
              <div className="p-3 md:p-4 bg-amber-700/30 rounded-full border-2 border-amber-400/30">
                <Book className="h-12 w-12 md:h-16 md:w-16 text-amber-300" />
              </div>
            </div>
            
            <h1 className="text-3xl md:text-6xl font-bold text-amber-100 tracking-wider">
              MANYAZEWAL
            </h1>
            <h2 className="text-2xl md:text-5xl font-bold text-amber-200 tracking-wider">
              ESHETU GIBI
            </h2>
            
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <div className="h-px w-12 md:w-16 bg-amber-400/50" />
              <span className="text-amber-300 text-lg md:text-xl font-serif">✦</span>
              <div className="h-px w-12 md:w-16 bg-amber-400/50" />
            </div>
            
            <h3 className="text-xl md:text-4xl font-light text-amber-200 tracking-widest">
              Restaurant Culture
            </h3>
            
            <p className="text-amber-300/70 text-xs md:text-sm max-w-md mx-auto font-serif">
              Our values, traditions, and cultural heritage
            </p>
          </div>

          <div className="absolute bottom-12 md:bottom-16 left-0 right-0 text-center">
            <p className="text-amber-400/50 text-[10px] md:text-xs tracking-widest">
              {cultures.length} CULTURES • {new Date().getFullYear()}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToTOC}
            className="absolute bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 px-6 md:px-8 py-2 md:py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-full font-medium shadow-lg transition-all flex items-center gap-2 text-sm md:text-base"
          >
            <BookOpen className="h-4 w-4" />
            Open Book
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  // Table of Contents Component
  const TableOfContents = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">Table of Contents</h2>
              <p className="text-xs text-gray-500">{filteredCultures.length} cultures</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToCover} className="text-gray-500 text-xs md:text-sm">
              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Cover
            </Button>
            {isAdmin && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Bookmark className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
            <Input
              placeholder="Search cultures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 md:pl-10 h-8 md:h-10 text-sm rounded-xl border-gray-200 dark:border-gray-700"
            />
          </div>
        </div>

        <div className="space-y-1 md:space-y-2 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2">
          {filteredCultures.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-gray-500">
              <BookOpen className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No cultures found</p>
              {isAdmin && (
                <p className="text-xs text-gray-400 mt-1">
                  Click "Add" to create your first culture entry
                </p>
              )}
            </div>
          ) : (
            filteredCultures.map((culture, index) => (
              <motion.button
                key={culture._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => openCulture(index)}
                className="w-full text-left p-2 md:p-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all duration-200 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <span className="text-[10px] md:text-xs font-bold text-amber-500 w-6 md:w-8 flex-shrink-0">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-200 truncate">
                          {culture.title}
                        </span>
                        {culture.imageUrl && (
                          <ImageIcon className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-0.5 text-[10px] md:text-xs text-gray-500">
                        <span className="flex items-center gap-0.5 md:gap-1">
                          <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          {new Date(culture.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-0.5 md:gap-1">
                          <Users className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          {culture.createdBy}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-gray-400 group-hover:text-amber-500 transition-colors flex-shrink-0 ml-1 md:ml-2" />
                </div>
              </motion.button>
            ))
          )}
        </div>

        <div className="mt-4 md:mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between text-[10px] md:text-xs text-gray-400">
          <span>Total: {filteredCultures.length} cultures</span>
          <span>{cultures.filter(c => c.imageUrl).length} with images</span>
        </div>
      </div>
    </motion.div>
  );

  // Culture Page Component - Book style layout
  const CulturePage = () => {
    const culture = filteredCultures[selectedCultureIndex];
    if (!culture) return null;

    const isLastCulture = selectedCultureIndex === filteredCultures.length - 1;
    const isFirstCulture = selectedCultureIndex === 0;
    const hasImage = culture.imageUrl && culture.imageUrl.length > 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        {/* Book style header with page number */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
            <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">
              Page {selectedCultureIndex + 1} of {filteredCultures.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToTOC}
              className="text-gray-500 text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              <Menu className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Contents
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(culture)}
                  className="text-blue-500 text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
                >
                  <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(culture)}
                  className="text-red-500 text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {/* Culture Title with decorative line */}
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Bookmark className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Cultural Heritage
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-100">
                  {culture.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(culture.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {culture.createdBy}
                  </span>
                  {culture.imageUrl && (
                    <Badge variant="secondary" className="text-[10px]">
                      <ImageIcon className="h-2.5 w-2.5 mr-1" />
                      With Image
                    </Badge>
                  )}
                </div>
              </div>
              {isAdmin && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <div className="mt-3 h-0.5 w-20 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" />
          </div>

          {/* Content layout - Image on left for desktop, top for mobile */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Image section - only show if image exists */}
            {hasImage && (
              <div className="md:w-2/5 lg:w-1/3 flex-shrink-0">
                <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
                  <img
                    src={culture.imageUrl}
                    alt={culture.title}
                    className="w-full h-auto object-cover aspect-[4/3]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder-culture.jpg";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <span className="text-xs text-white/90 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Cultural Image
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Description section */}
            <div className={hasImage ? "md:flex-1" : "w-full"}>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <div className="bg-amber-50/30 dark:bg-amber-950/10 rounded-xl p-4 md:p-6 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Description
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                    {culture.description}
                  </p>
                </div>
              </div>

              {/* Footer metadata */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last updated: {new Date(culture.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Culture #{selectedCultureIndex + 1}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation - Previous/Next Culture */}
          <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={prevCulture}
              disabled={isFirstCulture}
              className="border-gray-300 dark:border-gray-700 text-xs md:text-sm h-10 md:h-12 px-4 md:px-6 flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Culture
            </Button>
            
            <div className="flex items-center justify-center text-xs text-gray-400 px-2">
              {selectedCultureIndex + 1} of {filteredCultures.length}
            </div>

            <Button
              onClick={nextCulture}
              disabled={isLastCulture}
              className={`text-xs md:text-sm h-10 md:h-12 px-4 md:px-6 flex-1 ${
                isLastCulture 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-amber-600 hover:bg-amber-700'
              } text-white`}
            >
              {isLastCulture ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Collection
                </>
              ) : (
                <>
                  Next Culture
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Progress dots */}
          <div className="mt-4 flex justify-center gap-1.5">
            {filteredCultures.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (idx !== selectedCultureIndex) {
                    setSelectedCultureIndex(idx);
                    if (contentRef.current) {
                      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }
                }}
                className={`transition-all duration-200 rounded-full h-1.5 ${
                  idx === selectedCultureIndex
                    ? "w-6 bg-amber-500"
                    : "w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-amber-500" />
          <p className="text-sm text-gray-500 mt-3">Loading cultures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <Toaster position="top-right" />
      
      <div className="container mx-auto p-2 md:p-4 max-w-4xl">
        {/* Only show header for non-cover pages */}
        {currentPage !== "cover" && (
          <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
            <div className="flex items-center gap-1 md:gap-2">
              <Book className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
              <span className="text-[10px] md:text-sm font-medium text-gray-600 dark:text-gray-400">
                {currentPage === "toc" ? "Contents" : "Culture"}
              </span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="sm" onClick={goToCover} className="text-gray-500 text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3">
                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">Cover</span>
              </Button>
              {currentPage !== "toc" && (
                <Button variant="ghost" size="sm" onClick={goToTOC} className="text-gray-500 text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3">
                  <Menu className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  <span className="hidden sm:inline">Contents</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
        <div 
          ref={contentRef} 
          className={`${currentPage === "cover" ? "overflow-hidden" : "overflow-y-auto max-h-[calc(100vh-150px)]"}`}
        >
          <AnimatePresence mode="wait">
            {currentPage === "cover" && <BookCover key="cover" />}
            {currentPage === "toc" && <TableOfContents key="toc" />}
            {currentPage === "culture" && <CulturePage key="culture" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-gray-800">
              {isEditMode ? (
                <>
                  <Edit className="h-5 w-5 text-amber-500" />
                  Edit Culture
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-amber-500" />
                  Add New Culture
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update your restaurant's cultural heritage" 
                : "Add a new cultural value, tradition, or heritage"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter culture title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-gray-300 dark:border-gray-700"
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Describe the culture, tradition, or value..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="border-gray-300 dark:border-gray-700 resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-gray-400 mt-1">{description.length}/1000</p>
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Image (Optional)
              </label>
              
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="text-center text-white">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Uploading... {uploadProgress}%</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-amber-500 transition-colors">
                  <input
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(',')}
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer block"
                  >
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload an image
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG, GIF, WEBP up to 10MB
                    </p>
                  </label>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={isUploading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? "Update" : "Create"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(false);
                }}
                className="flex-1 border-gray-300 dark:border-gray-700"
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Culture
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{cultureToDelete?.title}</strong>"?
              <br />
              <span className="text-xs text-gray-500 mt-1 block">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}