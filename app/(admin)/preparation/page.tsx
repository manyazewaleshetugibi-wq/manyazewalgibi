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
        data.recipes.forEach((recipe: ExtendedRecipe) => {
          initialIndex[recipe._id!] = 0;
        });
        setCurrentStepIndex(initialIndex);
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

  const getTotalTimeDisplay = (totalTime: number) => {
    const hours = Math.floor(totalTime / 60);
    const minutes = totalTime % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDifficultyLevel = (steps: number, totalTime: number) => {
    if (steps <= 3 && totalTime <= 30) return { label: "Easy", color: "bg-green-100 text-green-800 border-green-200", icon: "🌟" };
    if (steps <= 6 && totalTime <= 60) return { label: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⭐" };
    return { label: "Advanced", color: "bg-red-100 text-red-800 border-red-200", icon: "🔥" };
  };

  const StepBookCard = ({ step, stepNumber, totalSteps, isActive }: { 
    step: any; 
    stepNumber: number; 
    totalSteps: number;
    isActive: boolean;
  }) => {
    if (!isActive) return null;
    
    // Get display values (support both old and new data structure)
    const timeDisplay = step.timeText || (step.timeAmount ? `${step.timeAmount} minutes` : null);
    const heatDisplay = step.heatText || step.heatPower;
    const tempDisplay = step.tempText || (step.temperature ? `${step.temperature}°C` : null);
    const timeValue = step.timeValue || step.timeAmount || 0;
    const hasIngredients = step.ingredients && step.ingredients.length > 0;
    const singleIngredient = step.ingredientName;
    
    return (
      <motion.div
        initial={{ opacity: 0, rotateY: -90 }}
        animate={{ opacity: 1, rotateY: 0 }}
        exit={{ opacity: 0, rotateY: 90 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
        className="book-page"
      >
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-2xl overflow-hidden border-2 border-amber-200 dark:border-amber-800">
          {/* Book Page Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-medium">Step {stepNumber} of {totalSteps}</span>
              </div>
              <Bookmark className="h-5 w-5" />
            </div>
          </div>

          {/* Book Page Content */}
          <div className="p-6">
            {/* Step Title */}
            <div className="mb-4 pb-3 border-b-2 border-dashed border-amber-300 dark:border-amber-700">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="text-2xl text-amber-600">{stepNumber}</span>
                <span>-</span>
                <span>Preparation Step</span>
              </h3>
            </div>

            {/* Time and Metadata - Using descriptive text */}
            <div className="flex flex-wrap gap-2 mb-4">
              {timeDisplay && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-sm py-1 px-3">
                  <Timer className="h-3 w-3 mr-1" />
                  {timeDisplay}
                </Badge>
              )}
              {heatDisplay && (
                <Badge className="bg-red-100 text-red-800 border-red-200 text-sm py-1 px-3">
                  <Flame className="h-3 w-3 mr-1" />
                  Heat: {heatDisplay}
                </Badge>
              )}
              {tempDisplay && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-sm py-1 px-3">
                  <Thermometer className="h-3 w-3 mr-1" />
                  {tempDisplay}
                </Badge>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-inner">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Ingredients Information - Support multiple ingredients */}
            {(hasIngredients || singleIngredient) && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-400">Ingredients Needed:</span>
                </div>
                {hasIngredients ? (
                  <div className="space-y-2">
                    {step.ingredients.map((ing: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">
                          • {ing.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ing.quantity} {ing.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">• {singleIngredient}</span>
                    {step.stockDetails && (
                      <Badge variant="outline" className="text-xs">
                        Stock: {step.stockDetails.currentStock} {step.stockDetails.unit}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            {step.notes && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border-l-4 border-amber-500">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-700 dark:text-amber-400 text-sm">Chef's Note:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                      {step.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Book Page Footer */}
          <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-gray-800 dark:to-gray-900 p-3 text-center border-t border-amber-200 dark:border-amber-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stepNumber === totalSteps ? "✓ Recipe Complete!" : "→ Continue to next step"}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  const RecipeCard = ({ recipe }: { recipe: ExtendedRecipe }) => {
    const itemImage = recipe.itemDetails?.imageUrl || "/placeholder-food.jpg";
    const difficulty = getDifficultyLevel(recipe.steps.length, recipe.totalTime || 0);
    const currentStep = currentStepIndex[recipe._id!] || 0;
    const currentStepData = recipe.steps[currentStep];
    
    // Calculate recipe stats
    const totalIngredients = recipe.steps.reduce((acc: number, step: PreparationStep) => {
      if (step.ingredients) return acc + step.ingredients.length;
      if (step.ingredientName) return acc + 1;
      return acc;
    }, 0);
    
    const averageTimePerStep = Math.floor((recipe.totalTime || 0) / recipe.steps.length);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-900 border-0 shadow-xl">
          {/* Recipe Header */}
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-6 text-white">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">{recipe.itemName}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/20 text-white border-0">
                    <ChefHat className="h-3 w-3 mr-1" />
                    {recipe.steps.length} Total Steps
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {getTotalTimeDisplay(recipe.totalTime || 0)}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0">
                    <Package className="h-3 w-3 mr-1" />
                    {totalIngredients} Ingredients
                  </Badge>
                  <Badge className={`${difficulty.color} border-0`}>
                    {difficulty.icon} {difficulty.label}
                  </Badge>
                  {recipe.version && recipe.version > 1 && (
                    <Badge className="bg-purple-500/80 text-white border-0">
                      Version {recipe.version}
                    </Badge>
                  )}
                </div>
              </div>
              {recipe.isAdminCreated && (
                <Star className="h-8 w-8 fill-yellow-400 text-yellow-400 animate-pulse" />
              )}
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/80">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{recipe.createdBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(recipe.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                <span>~{averageTimePerStep} min avg per step</span>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Recipe Progress
                </span>
                <span className="text-sm font-bold text-amber-600">
                  Step {currentStep + 1} of {recipe.steps.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Book-Style Step Card */}
            <div className="relative min-h-[500px]">
              <AnimatePresence mode="wait">
                <StepBookCard
                  key={currentStep}
                  step={currentStepData}
                  stepNumber={currentStep + 1}
                  totalSteps={recipe.steps.length}
                  isActive={true}
                />
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between gap-4 mt-6">
                <Button
                  onClick={() => prevStep(recipe._id!)}
                  disabled={currentStep === 0 || isFlipping[recipe._id!]}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous Step
                </Button>
                <Button
                  onClick={() => nextStep(recipe._id!, recipe.steps.length)}
                  disabled={currentStep === recipe.steps.length - 1 || isFlipping[recipe._id!]}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg"
                >
                  {currentStep === recipe.steps.length - 1 ? "Complete Recipe" : "Next Step"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Step Navigation Dots */}
            <div className="flex justify-center gap-2 mt-6 flex-wrap">
              {recipe.steps.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isFlipping[recipe._id!]) {
                      setIsFlipping(prev => ({ ...prev, [recipe._id!]: true }));
                      setTimeout(() => {
                        setCurrentStepIndex(prev => ({ ...prev, [recipe._id!]: idx }));
                        setTimeout(() => {
                          setIsFlipping(prev => ({ ...prev, [recipe._id!]: false }));
                        }, 300);
                      }, 300);
                    }
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? "w-8 bg-gradient-to-r from-amber-500 to-red-500"
                      : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            {/* Recipe Summary Stats */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Recipe Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Total Time</p>
                  <p className="font-semibold">{getTotalTimeDisplay(recipe.totalTime || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Steps</p>
                  <p className="font-semibold">{recipe.steps.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Ingredients Used</p>
                  <p className="font-semibold">{totalIngredients}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Avg Time/Step</p>
                  <p className="font-semibold">{averageTimePerStep} min</p>
                </div>
              </div>
            </div>

            {/* Food Image Gallery */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-amber-200 dark:border-amber-800">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-amber-600" />
                Final Dish Preview
              </h3>
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-800 dark:to-gray-900 shadow-inner">
                <img
                  src={itemImage}
                  alt={recipe.itemName}
                  className="w-full h-80 object-cover hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-food.jpg";
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="text-white text-lg font-bold">{recipe.itemName}</p>
                  {recipe.itemDetails?.price && (
                    <p className="text-white/90 text-sm">
                      {recipe.itemDetails.price.toLocaleString()} ETB
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
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
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-purple-600" />
          </motion.div>
          <p className="text-lg">Loading delicious recipes...</p>
        </Card>
      </div>
    );
  }

  // Get unique items for filter
  const uniqueItems = Array.from(new Map(recipes.map(r => [r.itemId, r.itemName])).entries())
    .map(([id, name]) => ({ id, name }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 md:p-6">
        <Toaster position="top-right" />

        {/* Hero Section with Book Theme */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-amber-500 to-red-600 rounded-2xl mb-4 shadow-xl">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-3">
            Recipe Book
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Flip through our beautifully crafted recipe collection with step-by-step instructions
          </p>
        </motion.div>

        {/* Search and Filter Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes by name, steps, time, heat, temperature..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="md:w-[250px]">
                  <SelectValue placeholder="Filter by menu item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items ({recipes.length})</SelectItem>
                  {uniqueItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({recipes.filter(r => r.itemId === item.id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchRecipes}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: BookOpen, label: "Total Recipes", value: recipes.length, color: "amber" },
            { icon: Layers, label: "Total Steps", value: recipes.reduce((acc, r) => acc + r.steps.length, 0), color: "orange" },
            { icon: Clock, label: "Total Time", value: getTotalTimeDisplay(recipes.reduce((acc: number, r: ExtendedRecipe) => acc + (r.totalTime || 0), 0)), color: "red" },
            { icon: Package, label: "Total Ingredients", value: recipes.reduce((acc: number, r: ExtendedRecipe) => {
              return acc + r.steps.reduce((stepAcc: number, step: PreparationStep) => {
                if (step.ingredients) return stepAcc + step.ingredients.length;
                if (step.ingredientName) return stepAcc + 1;
                return stepAcc;
              }, 0);
            }, 0), color: "green" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="text-center shadow-md border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardContent className="p-4">
                  <stat.icon className={`h-8 w-8 mx-auto mb-2 text-${stat.color}-600`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recipes Grid */}
        {filteredRecipes.length === 0 ? (
          <Card className="p-12 text-center border-0 shadow-md">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No recipes found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedItem !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Start by creating your first recipe in the recipe book"}
            </p>
          </Card>
        ) : (
          <>
            <div className="space-y-8">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
            </div>
            
            {/* Footer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center text-sm text-muted-foreground border-t pt-6"
            >
              <p>Showing {filteredRecipes.length} of {recipes.length} recipes</p>
              <p className="mt-2 text-xs">📖 Flip through pages to follow each recipe step by step</p>
              <p className="mt-1 text-xs">✨ Time, heat, and temperature descriptions are shown exactly as entered by the chef</p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
