"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  Flame,
  Thermometer,
  Save,
  ListChecks,
  ChefHat,
  AlertCircle,
  Edit,
  Package,
  RefreshCw,
  Loader2,
  Utensils,
  Search,
  X,
  ShoppingCart,
  Timer,
  ChevronRight,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Hash,
  Calendar,
  Layers,
} from "lucide-react";
import { extractFirstNumber, extractTemperature } from "@/types/preparation";
import type { SelectedIngredient } from "@/types/preparation";
import { motion, AnimatePresence } from "framer-motion";
import PreparationPanel from "./PreparationPanel";

// Time unit type
type TimeUnit = 'minutes' | 'seconds' | 'hours' | 'microseconds';

interface Item {
  _id: string;
  name: string;
  imageUrl: string;
  price: number;
}

interface StockItem {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  currentStock: number;
  minimumStock?: number;
}

interface ExistingRecipe {
  _id: string;
  itemId: string;
  itemName: string;
  steps: any[];
  totalTime: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// Helper function to convert time to minutes for total calculation
const convertToMinutes = (value: number, unit: TimeUnit): number => {
  switch (unit) {
    case 'seconds':
      return value / 60;
    case 'hours':
      return value * 60;
    case 'microseconds':
      return value / 60000000;
    case 'minutes':
    default:
      return value;
  }
};

// Helper function to format time for display
const formatTimeDisplay = (value: number, unit: TimeUnit): string => {
  if (value === 0) return '';
  const unitLabels = {
    'minutes': 'min',
    'seconds': 'sec',
    'hours': 'hr',
    'microseconds': 'μs'
  };
  return `${value} ${unitLabels[unit]}`;
};

// Helper to parse time from text with unit
const parseTimeFromText = (text: string): { value: number; unit: TimeUnit } => {
  const value = extractFirstNumber(text);
  if (value === 0) return { value: 0, unit: 'minutes' };
  
  const lowerText = text.toLowerCase();
  if (lowerText.includes('sec') || lowerText.includes('second')) {
    return { value, unit: 'seconds' };
  } else if (lowerText.includes('hour') || lowerText.includes('hr')) {
    return { value, unit: 'hours' };
  } else if (lowerText.includes('micro') || lowerText.includes('μs')) {
    return { value, unit: 'microseconds' };
  } else {
    return { value, unit: 'minutes' };
  }
};

export default function PreparationRegisterPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [ingredients, setIngredients] = useState<StockItem[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<StockItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [steps, setSteps] = useState<any[]>([
    {
      description: "",
      timeText: "",
      timeValue: 0,
      timeUnit: "minutes" as TimeUnit,
      timeMinutes: 0, // Store converted value in minutes for total calculation
      heatText: "",
      heatValue: null,
      tempText: "",
      tempValue: null,
      ingredients: [] as SelectedIngredient[],
      notes: null,
      imageUrl: null,
    },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchingItems, setFetchingItems] = useState(true);
  const [existingRecipe, setExistingRecipe] = useState<ExistingRecipe | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showExistingDialog, setShowExistingDialog] = useState(false);
  const [isFetchingRecipe, setIsFetchingRecipe] = useState(false);
  const [registeredRecipes, setRegisteredRecipes] = useState<any[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState("");
  const [selectedIngredientForStep, setSelectedIngredientForStep] = useState<StockItem | null>(null);
  const [ingredientQuantity, setIngredientQuantity] = useState(1);
  const [showIngredientDialog, setShowIngredientDialog] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  
  // State for showing more items
  const [showMoreRecipes, setShowMoreRecipes] = useState(false);
  const [showMoreIngredients, setShowMoreIngredients] = useState(false);
  const INITIAL_DISPLAY_COUNT = 3;

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch items, ingredients, and registered recipes
  useEffect(() => {
    const fetchData = async () => {
      setFetchingItems(true);
      try {
        const itemsRes = await fetch("/api/items");
        const itemsData = await itemsRes.json();
        const itemsList = itemsData.items || itemsData || [];
        setItems(itemsList);
        setFilteredItems(itemsList);

        const stockRes = await fetch("/api/stock");
        const stockData = await stockRes.json();
        const stockItems = stockData.items || stockData.data || stockData || [];
        setIngredients(stockItems);
        setFilteredIngredients(stockItems);

        await fetchRegisteredRecipes();
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
      } finally {
        setFetchingItems(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (itemSearchTerm) {
      setFilteredItems(
        items.filter(item =>
          item.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredItems(items);
    }
  }, [itemSearchTerm, items]);

  useEffect(() => {
    if (ingredientSearchTerm) {
      setFilteredIngredients(
        ingredients.filter(ingredient =>
          ingredient.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredIngredients(ingredients);
    }
  }, [ingredientSearchTerm, ingredients]);

  const fetchRegisteredRecipes = async () => {
    try {
      const response = await fetch("/api/preparation-steps?all=true");
      const data = await response.json();
      if (data.success) {
        setRegisteredRecipes(data.recipes || []);
      }
    } catch (error) {
      console.error("Error fetching registered recipes:", error);
    }
  };

  // Auto-open panel when item is selected
  useEffect(() => {
    if (selectedItemId && !isEditMode) {
      checkExistingRecipe();
      setIsPanelOpen(true);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    } else if (!selectedItemId) {
      setIsPanelOpen(false);
      setIsPanelExpanded(false);
      // Restore body scroll when panel is closed
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedItemId, isEditMode]);

  const checkExistingRecipe = async () => {
    setIsFetchingRecipe(true);
    try {
      const response = await fetch(`/api/preparation-steps?itemId=${selectedItemId}`);
      const data = await response.json();
      
      if (data.success && data.recipes && data.recipes.length > 0) {
        const recipe = data.recipes[0];
        setExistingRecipe(recipe);
        setShowExistingDialog(true);
      } else {
        setExistingRecipe(null);
      }
    } catch (error) {
      console.error("Error checking existing recipe:", error);
    } finally {
      setIsFetchingRecipe(false);
    }
  };

  const loadRecipeForEdit = () => {
    if (existingRecipe) {
      const loadedSteps = existingRecipe.steps.map((step: any) => ({
        description: step.description || "",
        timeText: step.timeText || (step.timeAmount ? `${step.timeAmount} ${step.timeUnit || 'minutes'}` : ""),
        timeValue: step.timeValue || step.timeAmount || 0,
        timeUnit: step.timeUnit || 'minutes',
        timeMinutes: step.timeMinutes || convertToMinutes(step.timeValue || step.timeAmount || 0, step.timeUnit || 'minutes'),
        heatText: step.heatText || step.heatPower || "",
        heatValue: step.heatValue || step.heatPower || null,
        tempText: step.tempText || (step.temperature ? `${step.temperature}°C` : ""),
        tempValue: step.tempValue || step.temperature || null,
        ingredients: step.ingredients || [],
        notes: step.notes || null,
        imageUrl: step.imageUrl || null,
      }));
      setSteps(loadedSteps);
      setIsEditMode(true);
      setShowExistingDialog(false);
      toast.success(`Loaded existing recipe for editing (Version ${existingRecipe.version})`);
    }
  };

  const createNewRecipe = () => {
    setIsEditMode(false);
    setShowExistingDialog(false);
    setSteps([
      {
        description: "",
        timeText: "",
        timeValue: 0,
        timeUnit: "minutes" as TimeUnit,
        timeMinutes: 0,
        heatText: "",
        heatValue: null,
        tempText: "",
        tempValue: null,
        ingredients: [],
        notes: null,
        imageUrl: null,
      },
    ]);
    setCurrentStep(0);
    toast.success("Creating new recipe version");
  };

  const handleDeleteRecipe = async (recipe: any) => {
    setRecipeToDelete(recipe);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/preparation-steps?recipeId=${recipeToDelete._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete recipe");
      }

      toast.success(`Recipe for "${recipeToDelete.itemName}" deleted successfully!`);
      
      // Refresh the recipes list
      await fetchRegisteredRecipes();
      
      // If the deleted recipe is currently being edited, reset the form
      if (isEditMode && existingRecipe?._id === recipeToDelete._id) {
        setSelectedItemId("");
        setSteps([
          {
            description: "",
            timeText: "",
            timeValue: 0,
            timeUnit: "minutes" as TimeUnit,
            timeMinutes: 0,
            heatText: "",
            heatValue: null,
            tempText: "",
            tempValue: null,
            ingredients: [],
            notes: null,
            imageUrl: null,
          },
        ]);
        setCurrentStep(0);
        setIsEditMode(false);
        setExistingRecipe(null);
        setIsPanelOpen(false);
        document.body.style.overflow = 'unset';
      }
    } catch (error: any) {
      console.error("Error deleting recipe:", error);
      toast.error(error.message || "Failed to delete recipe");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRecipeToDelete(null);
    }
  };

  const handleAddIngredientToStep = () => {
    if (!selectedIngredientForStep) {
      toast.error("Please select an ingredient");
      return;
    }
    if (!ingredientQuantity || ingredientQuantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const newIngredient: SelectedIngredient = {
      id: selectedIngredientForStep._id,
      name: selectedIngredientForStep.name,
      quantity: ingredientQuantity,
      unit: selectedIngredientForStep.unit,
    };

    const updatedSteps = [...steps];
    updatedSteps[currentStep].ingredients = [
      ...(updatedSteps[currentStep].ingredients || []),
      newIngredient,
    ];
    setSteps(updatedSteps);
    setSelectedIngredientForStep(null);
    setIngredientQuantity(1);
    setShowIngredientDialog(false);
    toast.success(`Added ${newIngredient.name} to step ${currentStep + 1}`);
  };

  const handleRemoveIngredientFromStep = (ingredientIndex: number) => {
    const updatedSteps = [...steps];
    const removedIngredient = updatedSteps[currentStep].ingredients[ingredientIndex];
    updatedSteps[currentStep].ingredients = updatedSteps[currentStep].ingredients.filter(
      (_: any, i: number) => i !== ingredientIndex
    );
    setSteps(updatedSteps);
    toast.success(`Removed ${removedIngredient.name} from step`);
  };

  const handleTimeChange = (text: string, unit?: TimeUnit) => {
    const numericValue = extractFirstNumber(text);
    const parsedUnit = unit || parseTimeFromText(text).unit;
    const timeMinutes = convertToMinutes(numericValue, parsedUnit);
    
    const updatedSteps = [...steps];
    updatedSteps[currentStep].timeText = text;
    updatedSteps[currentStep].timeValue = numericValue;
    updatedSteps[currentStep].timeUnit = parsedUnit;
    updatedSteps[currentStep].timeMinutes = timeMinutes;
    setSteps(updatedSteps);
  };

  const handleTimeUnitChange = (unit: TimeUnit) => {
    const currentStepData = steps[currentStep];
    const text = currentStepData.timeText || '';
    const numericValue = extractFirstNumber(text);
    const timeMinutes = convertToMinutes(numericValue, unit);
    
    const updatedSteps = [...steps];
    updatedSteps[currentStep].timeUnit = unit;
    updatedSteps[currentStep].timeValue = numericValue;
    updatedSteps[currentStep].timeMinutes = timeMinutes;
    // Update the text to reflect the new unit
    if (numericValue > 0) {
      const unitLabels = {
        'minutes': 'min',
        'seconds': 'sec',
        'hours': 'hr',
        'microseconds': 'μs'
      };
      // Replace the unit in the text or append it
      const cleanText = text.replace(/\s*(min|sec|hr|μs|minute|second|hour|microsecond)s?\b/gi, '').trim();
      updatedSteps[currentStep].timeText = `${cleanText} ${numericValue} ${unitLabels[unit]}`;
    }
    setSteps(updatedSteps);
  };

  const handleHeatChange = (text: string) => {
    const updatedSteps = [...steps];
    updatedSteps[currentStep].heatText = text;
    updatedSteps[currentStep].heatValue = text || null;
    setSteps(updatedSteps);
  };

  const handleTempChange = (text: string) => {
    const numericValue = extractTemperature(text);
    const updatedSteps = [...steps];
    updatedSteps[currentStep].tempText = text;
    updatedSteps[currentStep].tempValue = numericValue;
    setSteps(updatedSteps);
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        description: "",
        timeText: "",
        timeValue: 0,
        timeUnit: "minutes" as TimeUnit,
        timeMinutes: 0,
        heatText: "",
        heatValue: null,
        tempText: "",
        tempValue: null,
        ingredients: [],
        notes: null,
        imageUrl: null,
      },
    ]);
    setCurrentStep(steps.length);
    toast.success(`Step ${steps.length + 1} added`);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) {
      toast.error("At least one step is required");
      return;
    }
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
    if (currentStep >= newSteps.length) {
      setCurrentStep(newSteps.length - 1);
    }
    toast.success(`Step ${index + 1} removed`);
  };

  const handleStepChange = (field: string, value: any) => {
    const updatedSteps = [...steps];
    updatedSteps[currentStep] = { ...updatedSteps[currentStep], [field]: value };
    setSteps(updatedSteps);
  };

  const handleSubmit = async () => {
    if (!selectedItemId) {
      toast.error("Please select an item");
      return;
    }

    // Validate all steps
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].description.trim()) {
        toast.error(`Step ${i + 1} description is required`);
        setCurrentStep(i);
        return;
      }
      if (!steps[i].timeText.trim() || steps[i].timeValue <= 0) {
        toast.error(`Step ${i + 1} time is required and must include a number (e.g., "cook for 5 minutes")`);
        setCurrentStep(i);
        return;
      }
    }

    setLoading(true);
    try {
      const totalTime = steps.reduce((acc, step) => acc + (step.timeMinutes || 0), 0);
      
      // Prepare steps with step numbers
      const stepsWithNumbers = steps.map((step, idx) => ({
        ...step,
        stepNumber: idx + 1,
      }));
      
      let response;
      if (isEditMode && existingRecipe) {
        response = await fetch("/api/preparation-steps", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId: existingRecipe._id,
            steps: stepsWithNumbers,
            totalTime: totalTime,
          }),
        });
      } else {
        response = await fetch("/api/preparation-steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: selectedItemId,
            steps: stepsWithNumbers,
            totalTime: totalTime,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.exists) {
          setExistingRecipe(data.recipe);
          setShowExistingDialog(true);
          toast.error(data.error);
          return;
        }
        throw new Error(data.error);
      }

      toast.success(data.message || `Recipe ${isEditMode ? 'updated' : 'created'} successfully!`);
      
      // Reset form
      setSelectedItemId("");
      setSteps([
        {
          description: "",
          timeText: "",
          timeValue: 0,
          timeUnit: "minutes" as TimeUnit,
          timeMinutes: 0,
          heatText: "",
          heatValue: null,
          tempText: "",
          tempValue: null,
          ingredients: [],
          notes: null,
          imageUrl: null,
        },
      ]);
      setCurrentStep(0);
      setIsEditMode(false);
      setExistingRecipe(null);
      setItemSearchTerm("");
      setIngredientSearchTerm("");
      setIsPanelOpen(false);
      setIsPanelExpanded(false);
      document.body.style.overflow = 'unset';
      
      // Refresh registered recipes list
      await fetchRegisteredRecipes();
      
    } catch (error: any) {
      console.error("Error saving recipe:", error);
      toast.error(error.message || "Failed to save recipe");
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const selectedItem = items.find(item => item._id === selectedItemId);
  
  // Get displayed items for "Show More" functionality
  const displayedRecipes = showMoreRecipes ? registeredRecipes : registeredRecipes.slice(0, INITIAL_DISPLAY_COUNT);
  const displayedIngredients = showMoreIngredients ? filteredIngredients : filteredIngredients.slice(0, INITIAL_DISPLAY_COUNT);

  if (fetchingItems) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="p-8 text-center border border-gray-200 bg-white shadow-sm">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-purple-600" />
          <p className="text-lg font-medium text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white shadow-sm border border-gray-200">
              <ListChecks className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Food Preparation Recipe Registration</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Register cooking steps with descriptive text for time, heat, and temperature
              </p>
            </div>
          </div>
        </div>

        {/* Menu Selection Card */}
        <div className="border border-gray-200 bg-white shadow-sm mb-6 hover:shadow-md transition-shadow">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-purple-600" />
              <h3 className="text-base font-semibold text-gray-800">Select Menu Item</h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">Choose the item you want to create preparation steps for</p>
          </div>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Search menu items..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="pl-9 border-gray-300 focus:border-purple-500 focus:ring-purple-500 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1">
                <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={isEditMode}>
                  <SelectTrigger className="h-9 border-gray-300 bg-white text-sm">
                    <SelectValue placeholder="Select an item..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {filteredItems.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        <div className="flex items-center gap-2">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="w-5 h-5 object-cover" />
                          )}
                          <span className="font-medium text-sm">{item.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {item.price?.toLocaleString()} ETB
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isFetchingRecipe && (
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking for existing recipe...
              </div>
            )}
            {isEditMode && (
              <div className="mt-3">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Mode - Version {existingRecipe?.version}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registered Recipes */}
          <div className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Registered Recipes</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchRegisteredRecipes}
                  className="h-7 w-7 p-0 hover:bg-gray-100"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {registeredRecipes.length} recipe{registeredRecipes.length !== 1 ? 's' : ''} registered
              </p>
            </div>
            <div className="p-4">
              {registeredRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <ChefHat className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-400">No recipes registered yet</p>
                  <p className="text-xs text-gray-400 mt-1">Select a menu item to create your first recipe</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedRecipes.map((recipe) => (
                    <div
                      key={recipe._id}
                      className="group p-3 border border-gray-100 hover:border-green-200 hover:bg-green-50/20 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedItemId(recipe.itemId);
                            setItemSearchTerm("");
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-800">{recipe.itemName}</span>
                            {recipe.version && recipe.version > 1 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 text-gray-500">
                                v{recipe.version}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {recipe.steps?.length || 0} steps
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.totalTime} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(recipe.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecipe(recipe);
                            }}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete recipe"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {registeredRecipes.length > INITIAL_DISPLAY_COUNT && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMoreRecipes(!showMoreRecipes)}
                      className="w-full text-xs h-8 text-gray-500 hover:text-purple-600 mt-2"
                    >
                      <MoreHorizontal className="h-3 w-3 mr-1" />
                      {showMoreRecipes ? "Show Less" : `Show ${registeredRecipes.length - INITIAL_DISPLAY_COUNT} More`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stock Ingredients */}
          <div className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-800">Stock Ingredients</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">Available ingredients in your inventory</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search ingredients..."
                  value={ingredientSearchTerm}
                  onChange={(e) => setIngredientSearchTerm(e.target.value)}
                  className="pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                {filteredIngredients.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-400">No ingredients found</p>
                  </div>
                ) : (
                  <>
                    {displayedIngredients.map((ingredient) => (
                      <div key={ingredient._id} className="flex items-center justify-between p-3 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all duration-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{ingredient.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Unit: {ingredient.unit}</p>
                        </div>
                        <Badge className={`text-xs px-2 py-0.5 ${
                          ingredient.currentStock > 10 
                            ? "bg-green-100 text-green-700 border-green-200" 
                            : ingredient.currentStock > 0 
                            ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}>
                          {ingredient.currentStock || ingredient.quantity || 0}
                        </Badge>
                      </div>
                    ))}
                    
                    {filteredIngredients.length > INITIAL_DISPLAY_COUNT && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMoreIngredients(!showMoreIngredients)}
                        className="w-full text-xs h-8 text-gray-500 hover:text-blue-600 mt-2"
                      >
                        <MoreHorizontal className="h-3 w-3 mr-1" />
                        {showMoreIngredients ? "Show Less" : `Show ${filteredIngredients.length - INITIAL_DISPLAY_COUNT} More`}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preparation Panel Component */}
      <PreparationPanel
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedItemId("");
          document.body.style.overflow = 'unset';
        }}
        selectedItem={selectedItem}
        steps={steps}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        setSteps={setSteps}
        isEditMode={isEditMode}
        existingRecipe={existingRecipe}
        loading={loading}
        isPanelExpanded={isPanelExpanded}
        setIsPanelExpanded={setIsPanelExpanded}
        selectedItemId={selectedItemId}
        ingredients={ingredients}
        selectedIngredientForStep={selectedIngredientForStep}
        setSelectedIngredientForStep={setSelectedIngredientForStep}
        ingredientQuantity={ingredientQuantity}
        setIngredientQuantity={setIngredientQuantity}
        showIngredientDialog={showIngredientDialog}
        setShowIngredientDialog={setShowIngredientDialog}
        handleAddIngredientToStep={handleAddIngredientToStep}
        handleRemoveIngredientFromStep={handleRemoveIngredientFromStep}
        handleTimeChange={handleTimeChange}
        handleTimeUnitChange={handleTimeUnitChange}
        handleHeatChange={handleHeatChange}
        handleTempChange={handleTempChange}
        handleAddStep={handleAddStep}
        handleRemoveStep={handleRemoveStep}
        handleStepChange={handleStepChange}
        handleSubmit={handleSubmit}
      />

      {/* Add Ingredient Dialog */}
<Dialog open={showIngredientDialog} onOpenChange={setShowIngredientDialog}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-base text-gray-800">
        <ShoppingCart className="h-4 w-4 text-purple-600" />
        Add Ingredient to Step {currentStep + 1}
      </DialogTitle>
      <DialogDescription className="text-xs text-gray-500">
        Search and select an ingredient, then specify the required quantity
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-700 mb-1 block">Search Ingredient</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search ingredients..."
            value={ingredientSearchTerm}
            onChange={(e) => setIngredientSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-700 mb-1 block">Select Ingredient</label>
        <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
          {filteredIngredients.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {ingredientSearchTerm ? 'No ingredients found matching your search' : 'No ingredients available'}
            </div>
          ) : (
            filteredIngredients.slice(0, 10).map((ingredient) => (
              <div
                key={ingredient._id}
                className={`flex items-center justify-between p-2 cursor-pointer hover:bg-purple-50 transition-colors ${
                  selectedIngredientForStep?._id === ingredient._id ? 'bg-purple-50 border-l-2 border-purple-500' : ''
                }`}
                onClick={() => setSelectedIngredientForStep(ingredient)}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{ingredient.name}</p>
                  <p className="text-xs text-gray-500">Unit: {ingredient.unit}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Stock: {ingredient.currentStock || ingredient.quantity || 0}
                </Badge>
              </div>
            ))
          )}
          {filteredIngredients.length > 10 && (
            <div className="p-2 text-center text-xs text-gray-400 border-t border-gray-100">
              Showing 10 of {filteredIngredients.length} ingredients. Refine your search for more.
            </div>
          )}
        </div>
        {selectedIngredientForStep && (
          <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
            <p className="text-xs text-purple-700">
              Selected: <span className="font-medium">{selectedIngredientForStep.name}</span>
            </p>
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-gray-700 mb-1 block">Quantity</label>
        <Input
          type="number"
          min={0.1}
          step={0.1}
          value={ingredientQuantity}
          onChange={(e) => setIngredientQuantity(parseFloat(e.target.value) || 0)}
          className="h-9 text-sm border-gray-300"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button 
          onClick={handleAddIngredientToStep} 
          className="flex-1 h-9 text-sm bg-purple-600 hover:bg-purple-700"
          disabled={!selectedIngredientForStep || !ingredientQuantity || ingredientQuantity <= 0}
        >
          <Plus className="h-3.5 w-3.5 mr-2" />
          Add to Step
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            setShowIngredientDialog(false);
            setIngredientSearchTerm("");
          }} 
          className="flex-1 h-9 text-sm border-gray-300"
        >
          Cancel
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

      {/* Existing Recipe Dialog */}
      <Dialog open={showExistingDialog} onOpenChange={setShowExistingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-gray-800">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Recipe Already Exists
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              A recipe for "{selectedItem?.name}" already exists. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 border border-amber-200">
              <p className="text-xs font-medium text-amber-800 mb-2">Existing Recipe Details:</p>
              <ul className="text-xs space-y-1 text-amber-700">
                <li>• Steps: {existingRecipe?.steps.length}</li>
                <li>• Total Time: {existingRecipe?.totalTime} minutes</li>
                <li>• Version: {existingRecipe?.version}</li>
                <li>• Last Updated: {existingRecipe?.updatedAt ? new Date(existingRecipe.updatedAt).toLocaleDateString() : 'N/A'}</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button onClick={loadRecipeForEdit} className="flex-1 h-9 text-sm bg-blue-600 hover:bg-blue-700">
                <Edit className="h-3.5 w-3.5 mr-2" />
                Edit Existing
              </Button>
              <Button onClick={createNewRecipe} variant="outline" className="flex-1 h-9 text-sm border-gray-300">
                <Plus className="h-3.5 w-3.5 mr-2" />
                Create New
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete Recipe
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete the recipe for <strong>"{recipeToDelete?.itemName}"</strong>?
              <br />
              <span className="text-xs text-gray-500 mt-1 block">
                This action cannot be undone. All steps and ingredients will be permanently removed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-sm border-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRecipe}
              disabled={isDeleting}
              className="h-9 text-sm bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete Recipe
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}