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
  Info,
} from "lucide-react";
import { extractFirstNumber, extractTemperature } from "@/types/preparation";
import type { SelectedIngredient } from "@/types/preparation";

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

  useEffect(() => {
    if (selectedItemId && !isEditMode) {
      checkExistingRecipe();
    } else {
      setExistingRecipe(null);
    }
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
        timeText: step.timeText || (step.timeAmount ? `${step.timeAmount} minutes` : ""),
        timeValue: step.timeValue || step.timeAmount || 0,
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

  const handleTimeChange = (text: string) => {
    const numericValue = extractFirstNumber(text);
    const updatedSteps = [...steps];
    updatedSteps[currentStep].timeText = text;
    updatedSteps[currentStep].timeValue = numericValue;
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
      const totalTime = steps.reduce((acc, step) => acc + (step.timeValue || 0), 0);
      
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
      
      // Refresh registered recipes list
      await fetchRegisteredRecipes();
      
      // Optional: Redirect to display page
      // router.push('/preparation');
    } catch (error: any) {
      console.error("Error saving recipe:", error);
      toast.error(error.message || "Failed to save recipe");
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const registeredItems = registeredRecipes.map(recipe => ({
    id: recipe._id,
    itemId: recipe.itemId,
    itemName: recipe.itemName,
    stepsCount: recipe.steps?.length || 0,
    totalTime: recipe.totalTime,
    version: recipe.version,
    updatedAt: recipe.updatedAt
  }));

  if (fetchingItems) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-purple-600" />
          <p className="text-lg">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster position="top-right" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-purple-600" />
          Food Preparation Recipe Registration
        </h1>
        <p className="text-muted-foreground mt-2">
          Register cooking steps with descriptive text for time, heat, and temperature
        </p>
        {isEditMode && (
          <Badge className="mt-2 bg-blue-100 text-blue-800">
            <Edit className="h-3 w-3 mr-1" />
            Edit Mode - Updating existing recipe (Version {existingRecipe?.version})
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Registration Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Menu Item</CardTitle>
              <CardDescription>Choose the item you want to create preparation steps for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search menu items..."
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={isEditMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an item..." />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {filteredItems.map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      <div className="flex items-center gap-2">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.name} className="w-6 h-6 rounded object-cover" />
                        )}
                        <span>{item.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {item.price?.toLocaleString()} ETB
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFetchingRecipe && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking for existing recipe...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Steps Progress */}
          {selectedItemId && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      Step {currentStep + 1} of {steps.length}
                    </CardTitle>
                    <Badge variant="outline" className="text-lg">
                      {Math.round(progress)}% Complete
                    </Badge>
                  </div>
                  <Progress value={progress} className="mt-2" />
                </CardHeader>
              </Card>

              {/* Current Step Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Step {currentStep + 1} Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Step Description *</Label>
                    <Textarea
                      placeholder="Describe the cooking/preparation step..."
                      value={currentStepData.description}
                      onChange={(e) => handleStepChange("description", e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Time Description * (e.g., "cook for 5 minutes", "simmer for 10 min")
                      </Label>
                      <Input
                        value={currentStepData.timeText}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        placeholder="e.g., cook for 5 minutes, simmer for 10 min"
                        className="mt-1"
                      />
                      {currentStepData.timeValue > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Extracted time: {currentStepData.timeValue} minutes (used for total calculation)
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <Flame className="h-4 w-4" />
                        Heat Description (e.g., "low to preserve taste", "medium-high heat")
                      </Label>
                      <Input
                        value={currentStepData.heatText}
                        onChange={(e) => handleHeatChange(e.target.value)}
                        placeholder="e.g., low to preserve food taste, medium-high heat"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4" />
                        Temperature Description (e.g., "180°C preheated", "hot oil")
                      </Label>
                      <Input
                        value={currentStepData.tempText}
                        onChange={(e) => handleTempChange(e.target.value)}
                        placeholder="e.g., 180°C preheated oven, hot oil around 350°F"
                        className="mt-1"
                      />
                      {currentStepData.tempValue && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Extracted temperature: {currentStepData.tempValue}°C
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Multiple Ingredients Selection */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4" />
                      Ingredients Needed (Multiple)
                    </Label>
                    
                    {currentStepData.ingredients && currentStepData.ingredients.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {currentStepData.ingredients.map((ingredient: SelectedIngredient, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">{ingredient.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {ingredient.quantity} {ingredient.unit}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveIngredientFromStep(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowIngredientDialog(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Ingredient
                    </Button>
                  </div>

                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea
                      placeholder="Any special instructions or notes..."
                      value={currentStepData.notes || ""}
                      onChange={(e) => handleStepChange("notes", e.target.value || null)}
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                      disabled={currentStep === steps.length - 1}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleRemoveStep(currentStep)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Step
                    </Button>
                    <Button onClick={handleAddStep}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {/* Steps Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Steps Summary</CardTitle>
                  <CardDescription>Review all steps before saving</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {steps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          idx === currentStep ? "bg-purple-50 border-purple-300 dark:bg-purple-950/20" : "bg-gray-50 dark:bg-gray-900/20"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className="bg-purple-600">Step {idx + 1}</Badge>
                              {step.timeText && (
                                <Badge variant="outline">
                                  <Timer className="h-3 w-3 mr-1" />
                                  {step.timeText}
                                </Badge>
                              )}
                              {step.heatText && (
                                <Badge variant="outline">
                                  <Flame className="h-3 w-3 mr-1" />
                                  {step.heatText}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-1">{step.description || "No description"}</p>
                            {step.tempText && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Thermometer className="h-3 w-3" />
                                {step.tempText}
                              </p>
                            )}
                            {step.ingredients && step.ingredients.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {step.ingredients.map((ing: SelectedIngredient, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {ing.name} ({ing.quantity} {ing.unit})
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(idx)}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {isEditMode ? `Update Recipe (${steps.length} steps)` : `Save Complete Recipe (${steps.length} steps)`}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </div>

        {/* Right Column - Registered Items List */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Registered Recipes
                </span>
                <Button variant="ghost" size="sm" onClick={fetchRegisteredRecipes}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                {registeredItems.length} recipe{registeredItems.length !== 1 ? 's' : ''} registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registeredItems.length === 0 ? (
                <div className="text-center py-8">
                  <ChefHat className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No recipes registered yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {registeredItems.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedItemId(recipe.itemId);
                        setItemSearchTerm("");
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{recipe.itemName}</span>
                            {recipe.version && recipe.version > 1 && (
                              <Badge variant="outline" className="text-xs">
                                v{recipe.version}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Utensils className="h-3 w-3" />
                              {recipe.stepsCount} steps
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.totalTime} min total
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Edit
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Ingredients List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Stock Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ingredients..."
                  value={ingredientSearchTerm}
                  onChange={(e) => setIngredientSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredIngredients.map((ingredient) => (
                  <div key={ingredient._id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900/20">
                    <div>
                      <p className="text-sm font-medium">{ingredient.name}</p>
                      <p className="text-xs text-muted-foreground">Unit: {ingredient.unit}</p>
                    </div>
                    <Badge variant={ingredient.currentStock > 0 ? "default" : "destructive"}>
                      Stock: {ingredient.currentStock || ingredient.quantity || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Ingredient Dialog */}
      <Dialog open={showIngredientDialog} onOpenChange={setShowIngredientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Add Ingredient to Step {currentStep + 1}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Ingredient</Label>
              <Select
                value={selectedIngredientForStep?._id || ""}
                onValueChange={(value) => {
                  const ingredient = ingredients.find(i => i._id === value);
                  setSelectedIngredientForStep(ingredient || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an ingredient..." />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ingredient) => (
                    <SelectItem key={ingredient._id} value={ingredient._id}>
                      {ingredient.name} (Stock: {ingredient.currentStock || ingredient.quantity || 0} {ingredient.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={ingredientQuantity}
                onChange={(e) => setIngredientQuantity(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAddIngredientToStep} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
              <Button variant="outline" onClick={() => setShowIngredientDialog(false)} className="flex-1">
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
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Recipe Already Exists
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Recipe Details:</p>
              <ul className="text-sm space-y-1">
                <li>• Steps: {existingRecipe?.steps.length}</li>
                <li>• Total Time: {existingRecipe?.totalTime} minutes</li>
                <li>• Version: {existingRecipe?.version}</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button onClick={loadRecipeForEdit} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit Existing
              </Button>
              <Button onClick={createNewRecipe} variant="outline" className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
