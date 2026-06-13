"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Clock,
  Flame,
  Thermometer,
  ChefHat,
  Search,
  Package,
  Utensils,
  Star,
  RefreshCw,
  Info,
  User,
  Calendar,
  Layers,
  BookOpen,
  Bookmark,
  Timer,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Hash,
  AlertCircle,
  CheckCircle2,
  Circle,
  Play,
  Zap,
  Gauge,
  ListChecks,
  Sparkles,
  PanelsTopLeft,
  Maximize2,
  Minimize2,
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

// Helper function to extract first number from text
const extractFirstNumber = (text: string): number => {
  const match = text?.match(/\d+\.?\d*/);
  return match ? parseFloat(match[0]) : 0;
};

export default function PreparationDisplayPage() {
  const { data: session } = useSession();
  const [recipes, setRecipes] = useState<ExtendedRecipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<ExtendedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<string>("all");
  const [currentStepIndex, setCurrentStepIndex] = useState<Record<string, number>>({});
  const [isFlipping, setIsFlipping] = useState<Record<string, boolean>>({});
  const [compactMode, setCompactMode] = useState<Record<string, boolean>>({});

  const isAdmin = session?.user?.role?.toString().toUpperCase() === "ADMIN";

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
        // Initialize current step index for each recipe
        const initialIndex: Record<string, number> = {};
        const initialCompact: Record<string, boolean> = {};
        data.recipes.forEach((recipe: ExtendedRecipe) => {
          initialIndex[recipe._id!] = 0;
          initialCompact[recipe._id!] = false;
        });
        setCurrentStepIndex(initialIndex);
        setCompactMode(initialCompact);
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
            step.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (step.timeText && step.timeText.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (step.heatText && step.heatText.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (step.tempText && step.tempText.toLowerCase().includes(searchTerm.toLowerCase()))
          )
      );
    }

    if (selectedItem !== "all") {
      filtered = filtered.filter((recipe) => recipe.itemId === selectedItem);
    }

    setFilteredRecipes(filtered);
  };

  const nextStep = (recipeId: string, totalSteps: number) => {
    if (isFlipping[recipeId]) return;
    
    setIsFlipping(prev => ({ ...prev, [recipeId]: true }));
    setTimeout(() => {
      setCurrentStepIndex(prev => ({
        ...prev,
        [recipeId]: Math.min(prev[recipeId] + 1, totalSteps - 1)
      }));
      setTimeout(() => {
        setIsFlipping(prev => ({ ...prev, [recipeId]: false }));
      }, 300);
    }, 300);
  };

  const prevStep = (recipeId: string) => {
    if (isFlipping[recipeId]) return;
    
    setIsFlipping(prev => ({ ...prev, [recipeId]: true }));
    setTimeout(() => {
      setCurrentStepIndex(prev => ({
        ...prev,
        [recipeId]: Math.max(prev[recipeId] - 1, 0)
      }));
      setTimeout(() => {
        setIsFlipping(prev => ({ ...prev, [recipeId]: false }));
      }, 300);
    }, 300);
  };

  const toggleCompactMode = (recipeId: string) => {
    setCompactMode(prev => ({ ...prev, [recipeId]: !prev[recipeId] }));
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
    if (steps <= 3 && totalTime <= 30) return { label: "Easy", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "🌱" };
    if (steps <= 6 && totalTime <= 60) return { label: "Medium", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "⚡" };
    return { label: "Advanced", color: "bg-rose-100 text-rose-800 border-rose-200", icon: "🔥" };
  };

  // Modern Step Card Component - Minimal & Focused
  const ModernStepCard = ({ step, stepNumber, totalSteps, isActive, compact }: { 
    step: any; 
    stepNumber: number; 
    totalSteps: number;
    isActive: boolean;
    compact: boolean;
  }) => {
    if (!isActive) return null;
    
    const timeDisplay = step.timeText || (step.timeAmount ? `${step.timeAmount} min` : null);
    const heatDisplay = step.heatText || step.heatPower;
    const tempDisplay = step.tempText || (step.temperature ? `${step.temperature}°` : null);
    const hasIngredients = step.ingredients && step.ingredients.length > 0;
    const singleIngredient = step.ingredientName;
    
    if (compact) {
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
        >
          {/* Compact Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-bold">
                {stepNumber}
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                of {totalSteps}
              </span>
            </div>
            <div className="flex gap-1.5">
              {timeDisplay && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
                  <Timer className="h-2.5 w-2.5 mr-0.5" />
                  {timeDisplay}
                </Badge>
              )}
              {heatDisplay && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400">
                  <Flame className="h-2.5 w-2.5 mr-0.5" />
                  {heatDisplay}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Compact Content */}
          <div className="p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {step.description}
            </p>
            {(hasIngredients || singleIngredient) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {hasIngredients ? (
                  step.ingredients.slice(0, 2).map((ing: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-50 dark:bg-emerald-950/30">
                      {ing.name}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-50 dark:bg-emerald-950/30">
                    {singleIngredient}
                  </Badge>
                )}
                {(hasIngredients && step.ingredients.length > 2) && (
                  <span className="text-[10px] text-gray-400">+{step.ingredients.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      );
    }
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        {/* Step Header with Visual Progress */}
        <div className="relative px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-lg shadow-md">
                {stepNumber}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Step</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{stepNumber} of {totalSteps}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {timeDisplay && (
                <Badge className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-0 px-2 py-1">
                  <Timer className="h-3 w-3 mr-1" />
                  {timeDisplay}
                </Badge>
              )}
              {heatDisplay && (
                <Badge className="bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-0 px-2 py-1">
                  <Flame className="h-3 w-3 mr-1" />
                  {heatDisplay}
                </Badge>
              )}
              {tempDisplay && (
                <Badge className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-0 px-2 py-1">
                  <Thermometer className="h-3 w-3 mr-1" />
                  {tempDisplay}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Decorative line */}
          <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
        </div>

        {/* Main Content */}
        <div className="p-5">
          {/* Description */}
          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">
              {step.description}
            </p>
          </div>

          {/* Ingredients Section - Modern Chip Design */}
          {(hasIngredients || singleIngredient) && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Ingredients</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasIngredients ? (
                  step.ingredients.map((ing: any, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs py-1 px-2 bg-white dark:bg-gray-800 shadow-sm">
                      {ing.name} <span className="text-gray-400 ml-1">{ing.quantity} {ing.unit}</span>
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary" className="text-xs py-1 px-2 bg-white dark:bg-gray-800 shadow-sm">
                    {singleIngredient}
                    {step.stockDetails && (
                      <span className="text-gray-400 ml-1">({step.stockDetails.currentStock} {step.stockDetails.unit})</span>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Notes Section - Subtle */}
          {step.notes && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border-l-3 border-amber-400">
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  {step.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Step Footer with Completion Indicator */}
        <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {stepNumber === totalSteps ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Final step
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Play className="h-3 w-3" /> Next: Step {stepNumber + 1}
                </span>
              )}
            </span>
            {timeDisplay && (
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{extractFirstNumber(timeDisplay)} min
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Modern Recipe Card - Minimal Layout
  const RecipeCard = ({ recipe }: { recipe: ExtendedRecipe }) => {
    const itemImage = recipe.itemDetails?.imageUrl || "/placeholder-food.jpg";
    const difficulty = getDifficultyLevel(recipe.steps.length, recipe.totalTime || 0);
    const currentStep = currentStepIndex[recipe._id!] || 0;
    const currentStepData = recipe.steps[currentStep];
    const isCompact = compactMode[recipe._id!] || false;
    
    const totalIngredients = recipe.steps.reduce((acc: number, step: PreparationStep) => {
      if (step.ingredients) return acc + step.ingredients.length;
      if (step.ingredientName) return acc + 1;
      return acc;
    }, 0);
    
    const progressPercent = ((currentStep + 1) / recipe.steps.length) * 100;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="group"
      >
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-900 rounded-2xl">
          {/* Compact Header with Image Thumbnail */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              <img
                src={itemImage}
                alt={recipe.itemName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-food.jpg";
                }}
              />
            </div>
            
            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">
                  {recipe.itemName}
                </h2>
                {recipe.isAdminCreated && (
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                )}
                {recipe.version && recipe.version > 1 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    v{recipe.version}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  <ListChecks className="h-2.5 w-2.5 mr-0.5" />
                  {recipe.steps.length} steps
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  {getTotalTimeDisplay(recipe.totalTime || 0)}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  <Package className="h-2.5 w-2.5 mr-0.5" />
                  {totalIngredients} ing.
                </Badge>
                <Badge className={`${difficulty.color} text-[10px] px-1.5 py-0 h-5 border-0`}>
                  {difficulty.icon} {difficulty.label}
                </Badge>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCompactMode(recipe._id!)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
              >
                {isCompact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <CardContent className="p-4">
            {/* Progress Bar - Minimal */}
            <div className="mb-4">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  Step {currentStep + 1}/{recipe.steps.length}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Current Step Display */}
            <div className="relative min-h-[280px]">
              <AnimatePresence mode="wait">
                <ModernStepCard
                  key={`${recipe._id}-${currentStep}`}
                  step={currentStepData}
                  stepNumber={currentStep + 1}
                  totalSteps={recipe.steps.length}
                  isActive={true}
                  compact={isCompact}
                />
              </AnimatePresence>

              {/* Navigation Buttons - Minimal */}
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => prevStep(recipe._id!)}
                  disabled={currentStep === 0 || isFlipping[recipe._id!]}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => nextStep(recipe._id!, recipe.steps.length)}
                  disabled={currentStep === recipe.steps.length - 1 || isFlipping[recipe._id!]}
                  size="sm"
                  className="flex-1 h-9 text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-none"
                >
                  {currentStep === recipe.steps.length - 1 ? (
                    <>Complete <CheckCircle2 className="h-3.5 w-3.5 ml-1" /></>
                  ) : (
                    <>Next <ArrowRight className="h-3.5 w-3.5 ml-1" /></>
                  )}
                </Button>
              </div>
            </div>

            {/* Step Dots - Minimal */}
            <div className="flex justify-center gap-1.5 mt-4">
              {recipe.steps.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isFlipping[recipe._id!] && idx !== currentStep) {
                      setIsFlipping(prev => ({ ...prev, [recipe._id!]: true }));
                      setTimeout(() => {
                        setCurrentStepIndex(prev => ({ ...prev, [recipe._id!]: idx }));
                        setTimeout(() => {
                          setIsFlipping(prev => ({ ...prev, [recipe._id!]: false }));
                        }, 300);
                      }, 300);
                    }
                  }}
                  className={`transition-all duration-200 rounded-full ${
                    idx === currentStep
                      ? "w-5 h-1.5 bg-amber-500"
                      : "w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            {/* Quick Stats Row */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {recipe.createdBy}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {new Date(recipe.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" /> ~{Math.floor((recipe.totalTime || 0) / recipe.steps.length)} min/step
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <ChefHat className="h-8 w-8 text-amber-500" />
          </motion.div>
          <p className="text-sm text-gray-500 mt-2">Loading recipes...</p>
        </div>
      </div>
    );
  }

  const uniqueItems = Array.from(new Map(recipes.map(r => [r.itemId, r.itemName])).entries())
    .map(([id, name]) => ({ id, name }));

  const totalSteps = recipes.reduce((acc, r) => acc + r.steps.length, 0);
  const totalIngredients = recipes.reduce((acc: number, r: ExtendedRecipe) => {
    return acc + r.steps.reduce((stepAcc: number, step: PreparationStep) => {
      if (step.ingredients) return stepAcc + step.ingredients.length;
      if (step.ingredientName) return stepAcc + 1;
      return stepAcc;
    }, 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto p-4 max-w-5xl">
        <Toaster position="top-right" />

        {/* Header - Minimal Hero */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Recipe Guide
              </h1>
            </div>
            <p className="text-xs text-gray-400">{filteredRecipes.length} recipes</p>
          </div>
          <p className="text-xs text-gray-500 max-w-md">
            Step-by-step instructions for food preparation
          </p>
        </div>

        {/* Search & Filter - Minimal */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-xl"
              />
            </div>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm rounded-xl">
                <SelectValue placeholder="Filter by item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All items ({recipes.length})</SelectItem>
                {uniqueItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({recipes.filter(r => r.itemId === item.id).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchRecipes}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Quick Stats - Minimal */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-2 text-center shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{recipes.length}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Recipes</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-2 text-center shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalSteps}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Steps</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-2 text-center shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalIngredients}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ingredients</p>
          </div>
        </div>

        {/* Recipes List */}
        {filteredRecipes.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-sm font-medium text-gray-600 mb-1">No recipes found</h3>
            <p className="text-xs text-gray-400">
              {searchTerm || selectedItem !== "all" 
                ? "Try adjusting your search" 
                : "Create your first recipe"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe._id} recipe={recipe} />
            ))}
            
            {/* Footer */}
            <div className="text-center text-[10px] text-gray-400 py-4 border-t border-gray-100 dark:border-gray-800 mt-2">
              Showing {filteredRecipes.length} of {recipes.length} recipes
            </div>
          </div>
        )}
      </div>
    </div>
  );
}