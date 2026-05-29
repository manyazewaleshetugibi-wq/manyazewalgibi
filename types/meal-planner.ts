// types/meal-planner.ts

export interface Client {
  _id?: string;
  clientId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  
  // Health Metrics
  height: number; // cm
  weight: number; // kg
  bmi: number;
  bodyFat?: number;
  medicalConditions: string[];
  allergies: string[];
  dietaryRestrictions: string[];
  medications: string[];
  
  // Goals
  primaryGoal: 'weightLoss' | 'weightGain' | 'weightMaintenance' | 'muscleGain' | 'improveHealth' | 'sportsPerformance';
  targetWeight?: number;
  deadline?: Date;
  
  // Lifestyle
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
  sleepHours: number;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  waterIntake: number; // glasses per day
  
  // Preferences
  preferredCuisines: string[];
  dislikedFoods: string[];
  mealPreferences: {
    mealsPerDay: number;
    breakfastTime: string;
    lunchTime: string;
    dinnerTime: string;
    snackTimes: string[];
  };
  
  // Professional Notes
  notes: string;
  assignedMealPlanner: string;
  status: 'active' | 'inactive' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface MealItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  nutritionalInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
  };
  portionSize: string;
  imageUrl?: string;
  dietaryTags: string[];
  preparationTime: number;
}

export interface PlannedMeal {
  id?: string;
  mealItemId: string;
  mealItem: MealItem;
  quantity: number;
  customInstructions?: string;
  alternatives?: string[];
}

export interface DailySchedule {
  day: string;
  date: Date;
  meals: {
    breakfast: PlannedMeal[];
    morningSnack: PlannedMeal[];
    lunch: PlannedMeal[];
    afternoonSnack: PlannedMeal[];
    dinner: PlannedMeal[];
    eveningSnack: PlannedMeal[];
  };
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  hydrationReminder: string;
  exerciseSuggestion?: string;
  notes?: string;
}

export interface WeeklyMealPlan {
  _id?: string;
  planId: string;
  planName: string;
  description: string;
  clientId: string;
  clientInfo: {
    name: string;
    email: string;
    phone: string;
  };
  startDate: Date;
  endDate: Date;
  weekNumber: number;
  year: number;
  dailySchedules: DailySchedule[];
  
  // Nutritional Targets
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyCarbsTarget: number;
  dailyFatTarget: number;
  
  // Shopping List
  shoppingList: {
    ingredient: string;
    quantity: string;
    estimatedCost: number;
  }[];
  
  // Additional Info
  mealPrepTips: string[];
  groceryShoppingTips: string[];
  notesForClient: string;
  status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled';
  
  // Professional Info
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionTemplate {
  _id?: string;
  templateName: string;
  description: string;
  dailyCalorieTarget: number;
  mealStructure: {
    breakfast: { enabled: boolean; caloriePercent: number };
    morningSnack: { enabled: boolean; caloriePercent: number };
    lunch: { enabled: boolean; caloriePercent: number };
    afternoonSnack: { enabled: boolean; caloriePercent: number };
    dinner: { enabled: boolean; caloriePercent: number };
    eveningSnack: { enabled: boolean; caloriePercent: number };
  };
  macros: {
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
  };
  restrictions: string[];
}