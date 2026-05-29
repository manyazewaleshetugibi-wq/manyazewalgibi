// types/preparation.ts

export type HeatPower = "Low" | "Medium" | "High";

// Selected ingredient structure for multiple ingredients per step
export interface SelectedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  stockDetails?: {
    currentStock: number;
    unit: string;
  };
}

// Preparation step structure with descriptive text
export interface PreparationStep {
  stepNumber: number;
  description: string;
  // New descriptive fields
  timeText: string; // e.g., "cook for 5 minutes", "simmer for 10 min"
  timeValue: number; // extracted number for calculation
  heatText: string; // e.g., "low to preserve food taste", "medium-high heat"
  heatValue: string | null; // extraction or original value
  tempText: string; // e.g., "180°C preheated oven", "hot oil"
  tempValue: number | null; // extracted temperature in Celsius
  // Multiple ingredients support
  ingredients?: SelectedIngredient[];
  // Legacy fields (maintained for backward compatibility)
  timeAmount?: number; // deprecated, use timeValue
  heatPower?: HeatPower | null; // deprecated, use heatText
  temperature?: number | null; // deprecated, use tempValue
  ingredientName?: string | null; // legacy single ingredient
  // Other fields
  notes?: string | null;
  imageUrl?: string | null;
  stockDetails?: any; // For displaying stock info in UI
}

// Main recipe structure
export interface PreparationRecipe {
  _id?: string;
  itemId: string;
  itemName: string;
  steps: PreparationStep[];
  totalTime: number; // calculated from timeValue sum
  createdBy: string;
  createdByRole?: string;
  isAdminCreated: boolean;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  version: number;
  // Optional fields for enhanced display
  itemDetails?: {
    name: string;
    imageUrl: string;
    price: number;
  };
  totalSteps?: number;
}

// Stock item structure
export interface StockItem {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  currentStock: number;
  minimumStock?: number;
}

// Request structure for creating/updating recipes
export interface CreateRecipeRequest {
  itemId: string;
  steps: Omit<PreparationStep, 'stepNumber'>[];
  totalTime?: number;
}

// API response structure
export interface PreparationApiResponse {
  success: boolean;
  recipes?: PreparationRecipe[];
  recipe?: PreparationRecipe;
  count?: number;
  totalRecipes?: number;
  message?: string;
  error?: string;
  exists?: boolean;
  recipeId?: string;
  modifiedCount?: number;
  version?: number;
}

// Helper function to extract first number from text
export const extractFirstNumber = (text: string): number => {
  if (!text) return 0;
  const match = text.match(/\d+\.?\d*/);
  return match ? parseFloat(match[0]) : 0;
};

// Helper function to extract temperature number from text
export const extractTemperature = (text: string): number | null => {
  if (!text) return null;
  const match = text.match(/\d+\.?\d*/);
  return match ? parseFloat(match[0]) : null;
};

// Helper function to format time for display
export const formatTimeDisplay = (timeText: string, timeValue: number): string => {
  if (timeText) return timeText;
  if (timeValue > 0) return `${timeValue} minutes`;
  return "No time specified";
};

// Helper function to format heat for display
export const formatHeatDisplay = (heatText: string, heatPower?: HeatPower | null): string => {
  if (heatText) return heatText;
  if (heatPower) return heatPower;
  return "Not specified";
};

// Helper function to format temperature for display
export const formatTempDisplay = (tempText: string, temperature?: number | null): string => {
  if (tempText) return tempText;
  if (temperature) return `${temperature}°C`;
  return "Not specified";
};

// Helper function to calculate total time from steps
export const calculateTotalTime = (steps: PreparationStep[]): number => {
  return steps.reduce((total, step) => {
    return total + (step.timeValue || step.timeAmount || 0);
  }, 0);
};

// Helper function to count total ingredients across all steps
export const countTotalIngredients = (steps: PreparationStep[]): number => {
  return steps.reduce((count, step) => {
    if (step.ingredients && step.ingredients.length > 0) {
      return count + step.ingredients.length;
    }
    if (step.ingredientName) {
      return count + 1;
    }
    return count;
  }, 0);
};

// Helper function to get difficulty level
export const getDifficultyLevel = (steps: number, totalTime: number): {
  label: string;
  color: string;
  icon: string;
} => {
  if (steps <= 3 && totalTime <= 30) {
    return { label: "Easy", color: "bg-green-100 text-green-800 border-green-200", icon: "🌟" };
  }
  if (steps <= 6 && totalTime <= 60) {
    return { label: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⭐" };
  }
  return { label: "Advanced", color: "bg-red-100 text-red-800 border-red-200", icon: "🔥" };
};

// Helper function to format total time (minutes to readable format)
export const formatTotalTime = (totalTime: number): string => {
  const hours = Math.floor(totalTime / 60);
  const minutes = totalTime % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
};