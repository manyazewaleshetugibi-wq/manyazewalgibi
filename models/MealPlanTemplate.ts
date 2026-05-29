import mongoose, { Schema, Document } from 'mongoose'

interface IIngredient {
    name: string
    quantity: number
    unit: string
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
}

interface IInstruction {
    step: number
    description: string
    time?: number
    tip?: string
}

interface INutritionInfo {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
    sugar?: number
    sodium?: number
}

interface IMealEntry {
    id: string
    name: string
    description: string
    longDescription?: string
    ingredients: IIngredient[]
    nutrition: INutritionInfo
    instructions: IInstruction[]
    prepTime: number
    cookTime: number
    servings: number
    difficulty: 'easy' | 'medium' | 'hard'
    dietaryTags: string[]
    healthBenefits?: string[]
    allergens?: string[]
    imageUrl?: string
    tips?: string
    pairingSuggestions?: string
    sourceMenuItemId?: string
}

interface IDaySchedule {
    day: string
    meals: {
        breakfast: IMealEntry[]
        morningSnack: IMealEntry[]
        lunch: IMealEntry[]
        eveningSnack: IMealEntry[]
        dinner: IMealEntry[]
        nightMeal: IMealEntry[]
    }
}

interface IMealPlanTemplate extends Document {
    templateCode: string
    name: string
    description: string
    criteria: {
        minAge: number
        maxAge: number
        minWeight: number
        maxWeight: number
        minHeight: number
        maxHeight: number
        gender: 'male' | 'female' | 'any'
        fitnessGoal: string
        activityLevel: string
    }
    nutritionalTargets: {
        dailyCalories: number
        dailyProtein: number
        dailyCarbs: number
        dailyFat: number
        dailyWater: number
    }
    weeklySchedule: Record<string, IDaySchedule>
    mealPrepTips: string[]
    groceryTips: string[]
    shoppingList?: Array<{
        ingredient: string
        quantity: string
        category: string
    }>
    notesForClient: string
    status: 'active' | 'inactive' | 'draft'
    usageCount: number
    createdBy?: string
    createdAt: Date
    updatedAt: Date
}

const MealPlanTemplateSchema = new Schema<IMealPlanTemplate>({
    templateCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    criteria: {
        minAge: { type: Number, required: true },
        maxAge: { type: Number, required: true },
        minWeight: { type: Number, required: true },
        maxWeight: { type: Number, required: true },
        minHeight: { type: Number, required: true },
        maxHeight: { type: Number, required: true },
        gender: { type: String, enum: ['male', 'female', 'any'], default: 'any' },
        fitnessGoal: { type: String, required: true },
        activityLevel: { type: String, required: true },
    },
    nutritionalTargets: {
        dailyCalories: { type: Number, required: true },
        dailyProtein: { type: Number, required: true },
        dailyCarbs: { type: Number, required: true },
        dailyFat: { type: Number, required: true },
        dailyWater: { type: Number, default: 2500 },
    },
    weeklySchedule: { type: Object, required: true },
    mealPrepTips: [{ type: String }],
    groceryTips: [{ type: String }],
    shoppingList: [{
        ingredient: String,
        quantity: String,
        category: String,
    }],
    notesForClient: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

export default mongoose.models.MealPlanTemplate || mongoose.model<IMealPlanTemplate>('MealPlanTemplate', MealPlanTemplateSchema)
