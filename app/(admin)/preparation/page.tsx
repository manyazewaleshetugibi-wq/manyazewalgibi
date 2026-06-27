"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast, Toaster } from "react-hot-toast";
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
  Clock,
  Flame,
  Thermometer,
  Search,
  Package,
  Star,
  RefreshCw,
  User,
  Calendar,
  BookOpen,
  Bookmark,
  Timer,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  ListChecks,
  Sparkles,
  Menu,
  Download,
  Book,
  ChevronRight,
  Utensils,
  Coffee,
  Crown,
  Maximize2,
  Minimize2,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PreparationStep {
  description: string;
  timeText?: string;
  timeAmount?: number;
  timeValue?: number;
  heatText?: string;
  heatPower?: string;
  tempText?: string;
  temperature?: number;
  tempValue?: number;
  ingredients?: any[];
  ingredientName?: string;
  stockDetails?: {
    currentStock: number;
    unit: string;
  };
  notes?: string;
}

interface PreparationRecipe {
  _id?: string;
  itemId: string;
  itemName: string;
  steps: PreparationStep[];
  totalTime: number;
  createdBy?: string;
  createdAt: string;
  isAdminCreated?: boolean;
}

interface ExtendedRecipe extends PreparationRecipe {
  totalSteps?: number;
  itemDetails?: {
    name: string;
    imageUrl: string;
    price: number;
  };
  version?: number;
}

export default function PreparationBookPage() {
  const { data: session } = useSession();
  const [recipes, setRecipes] = useState<ExtendedRecipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<ExtendedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<"cover" | "toc" | "recipe">("cover");
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [searchTerm, selectedItem, recipes]);

  const fetchRecipes = async () => {
    try {
      const response = await fetch("/api/preparation-steps?all=true");
      const data = await response.json();
      
      if (data.success) {
        setRecipes(data.recipes);
        setFilteredRecipes(data.recipes);
      } else {
        toast.error("Failed to fetch recipes");
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
      toast.error("Error loading recipes");
    } finally {
      setLoading(false);
    }
  };

  const filterRecipes = () => {
    let filtered = [...recipes];

    if (searchTerm) {
      filtered = filtered.filter(
        (recipe: ExtendedRecipe) =>
          recipe.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.steps.some((step: PreparationStep) =>
            step.description.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (selectedItem !== "all") {
      filtered = filtered.filter((recipe) => recipe.itemId === selectedItem);
    }

    setFilteredRecipes(filtered);
  };

  const getTotalTimeDisplay = (totalTime: number) => {
    const hours = Math.floor(totalTime / 60);
    const minutes = totalTime % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDifficultyLevel = (steps: number, totalTime: number) => {
    if (steps <= 3 && totalTime <= 30) return { label: "Easy", color: "bg-emerald-100 text-emerald-800", icon: "🌱" };
    if (steps <= 6 && totalTime <= 60) return { label: "Medium", color: "bg-amber-100 text-amber-800", icon: "⚡" };
    return { label: "Advanced", color: "bg-rose-100 text-rose-800", icon: "🔥" };
  };

  const openRecipe = (index: number) => {
    setSelectedRecipeIndex(index);
    setCurrentPage("recipe");
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToCover = () => {
    setCurrentPage("cover");
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToTOC = () => {
    setCurrentPage("toc");
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const nextRecipe = () => {
    if (selectedRecipeIndex < filteredRecipes.length - 1) {
      setSelectedRecipeIndex(selectedRecipeIndex + 1);
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const prevRecipe = () => {
    if (selectedRecipeIndex > 0) {
      setSelectedRecipeIndex(selectedRecipeIndex - 1);
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const getTotalIngredients = (recipe: ExtendedRecipe) => {
    return recipe.steps.reduce((acc: number, step: PreparationStep) => {
      if (step.ingredients) return acc + step.ingredients.length;
      if (step.ingredientName) return acc + 1;
      return acc;
    }, 0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const downloadPDF = async () => {
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const element = bookRef.current;
      if (!element) {
        toast.error("Content not found");
        return;
      }

      toast.loading("Generating PDF...", { id: "pdf-generate" });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
        hotfixes: ["px_scaling"],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Food_Preparation_Standards.pdf`);

      toast.success("PDF downloaded successfully!", { id: "pdf-generate" });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF. Please try again.", { id: "pdf-generate" });
    } finally {
      setIsDownloading(false);
    }
  };

  // Book Cover Component - Clean, no borders, no extra text
  const BookCover = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full h-full flex items-center justify-center"
    >
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl">
        <div className="relative p-8 md:p-12 min-h-[500px] md:min-h-[600px] flex flex-col items-center justify-center text-center">
          {/* Decorative elements */}
          <div className="absolute top-8 right-8 opacity-20">
            <Utensils className="h-20 w-20 md:h-24 md:w-24 text-amber-300" />
          </div>
          <div className="absolute bottom-8 left-8 opacity-20">
            <Coffee className="h-20 w-20 md:h-24 md:w-24 text-amber-300" />
          </div>
          
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-24 md:w-32 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-24 md:w-32 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

          {/* Main content */}
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
              Food Preparation Standards
            </h3>
          </div>

          {/* Open button */}
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
              <p className="text-xs text-gray-500">{filteredRecipes.length} recipes</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={goToCover} className="text-gray-500 text-xs md:text-sm">
            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            Cover
          </Button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 md:pl-10 h-8 md:h-10 text-sm rounded-xl border-gray-200 dark:border-gray-700"
            />
          </div>
        </div>

        <div className="space-y-1 md:space-y-2 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-gray-500">
              <BookOpen className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No recipes found</p>
            </div>
          ) : (
            filteredRecipes.map((recipe, index) => {
              const difficulty = getDifficultyLevel(recipe.steps.length, recipe.totalTime || 0);
              const totalIngredients = getTotalIngredients(recipe);
              const totalSteps = recipe.steps.length;
              
              return (
                <motion.button
                  key={recipe._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openRecipe(index)}
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
                            {recipe.itemName}
                          </span>
                          {recipe.isAdminCreated && (
                            <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-0.5 text-[10px] md:text-xs text-gray-500">
                          <span className="flex items-center gap-0.5 md:gap-1">
                            <ListChecks className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            {totalSteps} steps
                          </span>
                          <span className="flex items-center gap-0.5 md:gap-1">
                            <Package className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            {totalIngredients} ing
                          </span>
                          <span className="flex items-center gap-0.5 md:gap-1">
                            <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            {getTotalTimeDisplay(recipe.totalTime || 0)}
                          </span>
                          <Badge className={`${difficulty.color} text-[8px] md:text-[10px] px-1 md:px-1.5 py-0 border-0`}>
                            {difficulty.icon} {difficulty.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-gray-400 group-hover:text-amber-500 transition-colors flex-shrink-0 ml-1 md:ml-2" />
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );

  // Recipe Page Component - ALL steps visible with full details
  const RecipePage = () => {
    const recipe = filteredRecipes[selectedRecipeIndex];
    if (!recipe) return null;

    const difficulty = getDifficultyLevel(recipe.steps.length, recipe.totalTime || 0);
    const totalIngredients = getTotalIngredients(recipe);
    const itemImage = recipe.itemDetails?.imageUrl || "/placeholder-food.jpg";
    const isLastRecipe = selectedRecipeIndex === filteredRecipes.length - 1;
    const isFirstRecipe = selectedRecipeIndex === 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        {/* Recipe Header with Image */}
        <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={itemImage}
            alt={recipe.itemName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-food.jpg";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
            <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1 md:mb-2">
              <Badge className="bg-amber-500/90 text-white border-0 text-[10px] md:text-xs">
                <Bookmark className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                Recipe #{selectedRecipeIndex + 1}
              </Badge>
              {recipe.isAdminCreated && (
                <Badge className="bg-amber-400/90 text-white border-0 text-[10px] md:text-xs">
                  <Star className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1 fill-white" />
                  Featured
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{recipe.itemName}</h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1 md:mt-2 text-xs md:text-sm text-white/80">
              <span className="flex items-center gap-0.5 md:gap-1">
                <ListChecks className="h-3 w-3 md:h-4 md:w-4" />
                {recipe.steps.length} steps
              </span>
              <span className="flex items-center gap-0.5 md:gap-1">
                <Package className="h-3 w-3 md:h-4 md:w-4" />
                {totalIngredients} ingredients
              </span>
              <span className="flex items-center gap-0.5 md:gap-1">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                {getTotalTimeDisplay(recipe.totalTime || 0)}
              </span>
              <Badge className={`${difficulty.color} border-0 text-[10px] md:text-xs`}>
                {difficulty.icon} {difficulty.label}
              </Badge>
            </div>
          </div>

          <div className="absolute top-2 md:top-4 right-2 md:right-4 flex gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToTOC}
              className="bg-black/30 hover:bg-black/50 text-white border-white/20 text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              <Menu className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Contents
            </Button>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {/* ALL Steps Display - Every step visible with full details */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <ListChecks className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                Preparation Steps
              </h2>
              <Badge variant="secondary" className="text-xs">
                <Layers className="h-3 w-3 mr-1" />
                {recipe.steps.length} steps
              </Badge>
            </div>

            {/* All steps displayed in order with full details */}
            {recipe.steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-l-4 border-amber-400 pl-3 md:pl-4 py-3 md:py-4 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 rounded-r-lg transition-colors"
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 font-bold text-sm md:text-base flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Step Description */}
                    <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                      {step.description}
                    </p>
                    
                    {/* Step Metadata - Time, Heat, Temperature */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {step.timeText && (
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 px-2 py-1">
                          <Timer className="h-3 w-3 mr-1.5" />
                          {step.timeText}
                        </Badge>
                      )}
                      {step.heatText && (
                        <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 px-2 py-1">
                          <Flame className="h-3 w-3 mr-1.5" />
                          {step.heatText}
                        </Badge>
                      )}
                      {step.tempText && (
                        <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 px-2 py-1">
                          <Thermometer className="h-3 w-3 mr-1.5" />
                          {step.tempText}
                        </Badge>
                      )}
                    </div>

                    {/* Ingredients - Full list */}
                    {(step.ingredients && step.ingredients.length > 0) && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <ShoppingCart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Ingredients</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {step.ingredients.map((ing: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1">
                              {ing.name} 
                              <span className="text-gray-400 ml-1 font-medium">
                                {ing.quantity} {ing.unit}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {step.notes && (
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic flex items-start gap-1.5 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{step.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* 🍽️ FINAL IMAGE CARD - Always displayed after all steps */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 md:mt-8 rounded-2xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-800 shadow-lg"
            >
              <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden">
                <img
                  src={itemImage}
                  alt={`${recipe.itemName} - Finished Dish`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-food.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                    <Badge className="bg-emerald-500/90 text-white border-0 text-xs md:text-sm px-3 py-1">
                      ✨ Finished Dish
                    </Badge>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold">{recipe.itemName}</h3>
                  <p className="text-sm md:text-base text-white/80">Ready to serve! 🍽️</p>
                </div>

                <div className="absolute top-4 right-4">
                  <Badge className="bg-white/95 text-gray-800 border-0 px-3 py-1.5 shadow-lg backdrop-blur-sm text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Complete
                  </Badge>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recipe Footer */}
          <div className="mt-6 md:mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] md:text-xs text-gray-400">
              <div className="flex items-center gap-1 md:gap-2">
                <User className="h-2.5 w-2.5 md:h-3 md:w-3" />
                {recipe.createdBy || "Unknown"}
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
                {new Date(recipe.createdAt).toLocaleDateString()}
              </div>
              {recipe.version && recipe.version > 1 && (
                <Badge variant="outline" className="text-[8px] md:text-[10px]">
                  v{recipe.version}
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                Total: {getTotalTimeDisplay(recipe.totalTime || 0)}
              </span>
            </div>
          </div>

          {/* Navigation - Next Recipe / Previous Recipe */}
          <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-between gap-3">
            <Button
              variant="outline"
              onClick={prevRecipe}
              disabled={isFirstRecipe}
              className="border-gray-300 dark:border-gray-700 text-xs md:text-sm h-10 md:h-12 px-4 md:px-6 flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Recipe
            </Button>
            
            <div className="flex items-center justify-center text-xs text-gray-400 px-2">
              {selectedRecipeIndex + 1} of {filteredRecipes.length}
            </div>

            <Button
              onClick={nextRecipe}
              disabled={isLastRecipe}
              className={`text-xs md:text-sm h-10 md:h-12 px-4 md:px-6 flex-1 ${
                isLastRecipe 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-amber-600 hover:bg-amber-700'
              } text-white`}
            >
              {isLastRecipe ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Collection
                </>
              ) : (
                <>
                  Next Recipe
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Progress dots */}
          <div className="mt-4 flex justify-center gap-1.5">
            {filteredRecipes.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (idx !== selectedRecipeIndex) {
                    setSelectedRecipeIndex(idx);
                    if (contentRef.current) {
                      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }
                }}
                className={`transition-all duration-200 rounded-full h-1.5 ${
                  idx === selectedRecipeIndex
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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Book className="h-8 w-8 md:h-12 md:w-12 text-amber-500" />
          </motion.div>
          <p className="text-xs md:text-sm text-gray-500 mt-2 md:mt-3">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <Toaster position="top-right" />
      
      {/* Floating Controls */}
      <div className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2">
        {currentPage !== "cover" && (
          <>
            <Button
              onClick={downloadPDF}
              disabled={isDownloading}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg rounded-full px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-2 border-white border-t-transparent mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Download PDF</span>
                </>
              )}
            </Button>
            <Button
              onClick={toggleFullscreen}
              className="bg-gray-700 hover:bg-gray-800 text-white shadow-lg rounded-full px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Maximize2 className="h-3 w-3 md:h-4 md:w-4" />
              )}
            </Button>
          </>
        )}
      </div>

      {/* Main Book Container - No scroll, clean display */}
      <div ref={bookRef} className="container mx-auto p-2 md:p-4 max-w-4xl h-screen flex flex-col">
        {/* Only show header for non-cover pages */}
        {currentPage !== "cover" && (
          <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
            <div className="flex items-center gap-1 md:gap-2">
              <Book className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
              <span className="text-[10px] md:text-sm font-medium text-gray-600 dark:text-gray-400">
                {currentPage === "toc" ? "Contents" : "Recipe"}
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

        {/* Page Content - No scroll for cover, scrollable for others */}
        <div 
          ref={contentRef} 
          className={`flex-1 ${currentPage === "cover" ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          <AnimatePresence mode="wait">
            {currentPage === "cover" && <BookCover key="cover" />}
            {currentPage === "toc" && <TableOfContents key="toc" />}
            {currentPage === "recipe" && <RecipePage key="recipe" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 