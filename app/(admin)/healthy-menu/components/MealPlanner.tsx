"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarIcon, Clock, Apple, Coffee, Sun, Moon, Utensils, Plus, Trash2, Save, Target, Flame, Activity, Dumbbell, Scale, Heart, Droplet, Zap, ChevronRight, ChevronLeft, Calendar, CheckCircle, AlertCircle, TrendingUp, Leaf, Award, FileText, ClipboardList, Eye, ChefHat, ListChecks, BookOpen, Info, ShoppingBag, Timer, Thermometer, Users, Filter, Search, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

// ============= TYPES =============

interface MenuItem {
    _id?: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    imageUrl?: string;
    cloudinaryData?: {
        publicId: string;
        url: string;
        format: string;
        bytes: number;
    };
    nutritionalInfo?: {
        calories: number;
        protein: number;
        carbohydrates: number;
        fat: number;
    };
    preparationTime?: number;
    isActive?: boolean;
    isFeatured?: boolean;
    dietaryInfo?: {
        isGlutenFree?: boolean;
        isVegan?: boolean;
        isVegetarian?: boolean;
        isDairyFree?: boolean;
        isLowCarb?: boolean;
    };
    ingredients?: Array<{
        name: string;
        quantity: number;
        unit: string;
    }>;
}

interface Category {
    _id: string;
    name: string;
}

interface MealItemWithDetails {
    id: string
    menuItemId?: string
    name: string
    description: string
    ingredients: Array<{ name: string; quantity: number; unit: string }>
    nutrition: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    preparationTime: number
    dietaryTags: string[]
    imageUrl?: string
}

interface MealPeriodDescription {
    description: string
    tips: string
    hydration: string
}

interface DaySchedule {
    day: string
    mealPeriodDescriptions: {
        breakfast: MealPeriodDescription
        morningSnack: MealPeriodDescription
        lunch: MealPeriodDescription
        eveningSnack: MealPeriodDescription
        dinner: MealPeriodDescription
        nightMeal: MealPeriodDescription
    }
    meals: {
        breakfast: MealItemWithDetails[]
        morningSnack: MealItemWithDetails[]
        lunch: MealItemWithDetails[]
        eveningSnack: MealItemWithDetails[]
        dinner: MealItemWithDetails[]
        nightMeal: MealItemWithDetails[]
    }
}

interface MealPlanTemplate {
    _id?: string
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
    weeklySchedule: Record<string, DaySchedule>
    mealPrepTips: string[]
    groceryTips: string[]
    notesForClient: string
    status: 'active' | 'inactive' | 'draft'
    usageCount: number
    createdAt: Date
    updatedAt: Date
}

// ============= CONSTANTS =============

const FITNESS_GOALS = [
    { id: 'fatLoss', label: 'Fat Loss', icon: Flame, description: 'Calorie deficit focused plan', color: 'from-orange-500 to-red-500' },
    { id: 'muscleGain', label: 'Muscle Gain', icon: Dumbbell, description: 'High protein, calorie surplus', color: 'from-blue-500 to-cyan-500' },
    { id: 'maintain', label: 'Maintain Weight', icon: Scale, description: 'Balanced maintenance plan', color: 'from-green-500 to-emerald-500' },
    { id: 'leanBody', label: 'Lean Body', icon: Leaf, description: 'Body recomposition focus', color: 'from-teal-500 to-green-500' },
    { id: 'athletic', label: 'Athletic Performance', icon: Zap, description: 'Energy & endurance optimized', color: 'from-purple-500 to-pink-500' },
]

const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Sedentary', multiplier: 1.2, description: 'Little or no exercise' },
    { id: 'light', label: 'Light Activity', multiplier: 1.375, description: 'Exercise 1-3 days/week' },
    { id: 'moderate', label: 'Moderate Activity', multiplier: 1.55, description: 'Exercise 3-5 days/week' },
    { id: 'active', label: 'Active', multiplier: 1.725, description: 'Daily exercise' },
    { id: 'veryActive', label: 'Very Active', multiplier: 1.9, description: 'Athlete' },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MEAL_TIMES = [
    { id: 'breakfast', label: 'Morning Breakfast', icon: Coffee, time: '7:00 - 9:00 AM', color: 'bg-amber-100 dark:bg-amber-950/50', importance: 'Most Important Meal', benefits: 'Boosts metabolism, provides energy' },
    { id: 'morningSnack', label: 'Mid-Morning Snack', icon: Apple, time: '10:00 - 11:00 AM', color: 'bg-yellow-100 dark:bg-yellow-950/50', importance: 'Energy Boost', benefits: 'Prevents overeating at lunch' },
    { id: 'lunch', label: 'Afternoon Lunch', icon: Utensils, time: '12:00 - 2:00 PM', color: 'bg-green-100 dark:bg-green-950/50', importance: 'Main Meal', benefits: 'Sustains afternoon energy' },
    { id: 'eveningSnack', label: 'Evening Snack', icon: Apple, time: '3:00 - 4:00 PM', color: 'bg-orange-100 dark:bg-orange-950/50', importance: 'Pre-Workout', benefits: 'Fuels evening workout' },
    { id: 'dinner', label: 'Dinner', icon: Sun, time: '6:00 - 8:00 PM', color: 'bg-blue-100 dark:bg-blue-950/50', importance: 'Light Meal', benefits: 'Promotes good sleep' },
    { id: 'nightMeal', label: 'Night Meal', icon: Moon, time: '9:00 - 10:00 PM', color: 'bg-purple-100 dark:bg-purple-950/50', importance: 'Optional', benefits: 'Muscle recovery' },
]

// ============= HELPER FUNCTIONS =============

const generateTemplateCode = () => {
    const prefix = 'MP'
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}-${year}${month}-${randomNum}`
}

const convertMenuItemToMealItem = (item: MenuItem): MealItemWithDetails => ({
    id: crypto.randomUUID(),
    menuItemId: item._id,
    name: item.name,
    description: item.description || '',
    ingredients: item.ingredients || [],
    nutrition: {
        calories: item.nutritionalInfo?.calories || 0,
        protein: item.nutritionalInfo?.protein || 0,
        carbs: item.nutritionalInfo?.carbohydrates || 0,
        fat: item.nutritionalInfo?.fat || 0,
    },
    preparationTime: item.preparationTime || 10,
    dietaryTags: [
        item.dietaryInfo?.isVegan ? 'Vegan' : '',
        item.dietaryInfo?.isVegetarian ? 'Vegetarian' : '',
        item.dietaryInfo?.isGlutenFree ? 'Gluten Free' : '',
        item.dietaryInfo?.isDairyFree ? 'Dairy Free' : '',
        item.dietaryInfo?.isLowCarb ? 'Low Carb' : '',
    ].filter(Boolean),
    imageUrl: item.cloudinaryData?.url || item.imageUrl,
})

const createEmptyMealPeriodDescription = (): MealPeriodDescription => ({
    description: '',
    tips: '',
    hydration: '',
})

const createEmptyDaySchedule = (day: string): DaySchedule => ({
    day,
    mealPeriodDescriptions: {
        breakfast: createEmptyMealPeriodDescription(),
        morningSnack: createEmptyMealPeriodDescription(),
        lunch: createEmptyMealPeriodDescription(),
        eveningSnack: createEmptyMealPeriodDescription(),
        dinner: createEmptyMealPeriodDescription(),
        nightMeal: createEmptyMealPeriodDescription(),
    },
    meals: {
        breakfast: [],
        morningSnack: [],
        lunch: [],
        eveningSnack: [],
        dinner: [],
        nightMeal: [],
    },
})

// ============= MEAL ITEM DISPLAY CARD =============

interface MealItemCardProps {
    item: MealItemWithDetails
    index: number
    onRemove: () => void
}

function MealItemCard({ item, index, onRemove }: MealItemCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border shadow-sm overflow-hidden"
        >
            <div className="flex justify-between items-start p-3 bg-gradient-to-r from-gray-50 to-white border-b">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">{index + 1}</span>
                    <span className="font-medium text-gray-800">{item.name}</span>
                    {item.dietaryTags.length > 0 && (
                        <div className="flex gap-1">
                            {item.dietaryTags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-7 w-7 p-0">
                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-90")} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onRemove} className="h-7 w-7 p-0 text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <div className="p-3 grid grid-cols-4 gap-2 text-center bg-gray-50/50">
                <div><p className="text-xs text-gray-500">Calories</p><p className="text-sm font-semibold text-orange-600">{item.nutrition.calories}</p></div>
                <div><p className="text-xs text-gray-500">Protein</p><p className="text-sm font-semibold text-blue-600">{item.nutrition.protein}g</p></div>
                <div><p className="text-xs text-gray-500">Carbs</p><p className="text-sm font-semibold text-yellow-600">{item.nutrition.carbs}g</p></div>
                <div><p className="text-xs text-gray-500">Fat</p><p className="text-sm font-semibold text-red-600">{item.nutrition.fat}g</p></div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="p-3 space-y-2 border-t">
                            {item.description && (
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Description</p>
                                    <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                            )}
                            {item.ingredients && item.ingredients.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Ingredients</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {item.ingredients.map((ing, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                                {ing.quantity}{ing.unit} {ing.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 text-xs text-gray-400 pt-1">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prep: {item.preparationTime}min</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ============= MEAL SELECTOR DROPDOWN =============

interface MealSelectorProps {
    onSelectMeal: (meal: MealItemWithDetails) => void
    menuItems: MenuItem[]
    categories: Category[]
}

function MealSelector({ onSelectMeal, menuItems, categories }: MealSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")

    const getCategoryName = (categoryId: string) => {
        return categories.find(c => c._id === categoryId)?.name || "Uncategorized"
    }

    const filteredItems = menuItems.filter(item => {
        const matchesSearch = searchTerm === "" || item.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory
        return matchesSearch && matchesCategory && item.isActive !== false
    })

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 border-green-200 hover:bg-green-50">
                    <Plus className="w-3.5 h-3.5" />
                    Add from Menu
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <div className="flex flex-col">
                    <div className="flex items-center border-b px-3 py-2 gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search menu items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border-0 focus-visible:ring-0 h-8"
                            autoFocus
                        />
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <ScrollArea className="max-h-[350px] overflow-y-auto">
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No menu items found</p>
                            </div>
                        ) : (
                            <div className="space-y-1 p-1">
                                {filteredItems.map((item) => (
                                    <Button
                                        key={item._id}
                                        variant="ghost"
                                        className="w-full justify-start text-left h-auto py-2 px-3"
                                        onClick={() => {
                                            onSelectMeal(convertMenuItemToMealItem(item))
                                            setIsOpen(false)
                                            setSearchTerm("")
                                        }}
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{item.name}</div>
                                            <div className="flex gap-2 text-xs text-gray-500">
                                                <span>🔥 {item.nutritionalInfo?.calories || 0} cal</span>
                                                <span>💪 {item.nutritionalInfo?.protein || 0}g</span>
                                                <span>⏱️ {item.preparationTime || 10} min</span>
                                                <span className="text-green-600">{getCategoryName(item.categoryId)}</span>
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="border-t p-2">
                        <span className="text-xs text-gray-500">{filteredItems.length} items available</span>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

// ============= MEAL PERIOD SECTION =============

interface MealPeriodSectionProps {
    mealTimeId: string
    mealTimeLabel: string
    mealTimeIcon: any
    mealTimeTime: string
    mealTimeColor: string
    mealTimeImportance: string
    mealTimeBenefits: string
    description: MealPeriodDescription
    onDescriptionChange: (field: keyof MealPeriodDescription, value: string) => void
    meals: MealItemWithDetails[]
    onAddMeal: (meal: MealItemWithDetails) => void
    onRemoveMeal: (index: number) => void
    menuItems: MenuItem[]
    categories: Category[]
}

function MealPeriodSection({
    mealTimeId,
    mealTimeLabel,
    mealTimeIcon: Icon,
    mealTimeTime,
    mealTimeColor,
    mealTimeImportance,
    mealTimeBenefits,
    description,
    onDescriptionChange,
    meals,
    onAddMeal,
    onRemoveMeal,
    menuItems,
    categories,
}: MealPeriodSectionProps) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

    return (
        <div className="space-y-3 border rounded-lg overflow-hidden">
            {/* Meal Time Header */}
            <div className={cn("p-3", mealTimeColor)}>
                <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <h4 className="font-semibold text-base">{mealTimeLabel}</h4>
                    <span className="text-xs text-gray-600">• {mealTimeTime}</span>
                    <Badge variant="outline" className="text-xs ml-2">{mealTimeImportance}</Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">{mealTimeBenefits}</p>
            </div>

            <div className="p-3 space-y-3">
                {/* Meal Period Description */}
                <div className="border rounded-lg p-3 bg-gray-50/50">
                    <button
                        className="flex justify-between items-center w-full"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    >
                        <span className="text-sm font-medium flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-green-600" />
                            Meal Period Description & Tips
                        </span>
                        <ChevronRight className={cn("w-4 h-4 transition-transform", isDescriptionExpanded && "rotate-90")} />
                    </button>

                    <AnimatePresence>
                        {isDescriptionExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                <div className="space-y-3 mt-3 pt-3 border-t">
                                    <div>
                                        <Label className="text-xs">Description for this meal period</Label>
                                        <Textarea
                                            placeholder={`Describe what ${mealTimeLabel.toLowerCase()} should focus on, what nutrients are important, etc.`}
                                            value={description.description}
                                            onChange={(e) => onDescriptionChange('description', e.target.value)}
                                            rows={2}
                                            className="text-sm mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Meal Prep Tips</Label>
                                        <Textarea
                                            placeholder={`Tips for preparing ${mealTimeLabel.toLowerCase()} ahead of time...`}
                                            value={description.tips}
                                            onChange={(e) => onDescriptionChange('tips', e.target.value)}
                                            rows={1}
                                            className="text-sm mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Hydration Reminder</Label>
                                        <Input
                                            placeholder="e.g., Drink 500ml water with this meal"
                                            value={description.hydration}
                                            onChange={(e) => onDescriptionChange('hydration', e.target.value)}
                                            className="text-sm mt-1"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Add Meal Button */}
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Meals for {mealTimeLabel}</span>
                    <MealSelector onSelectMeal={onAddMeal} menuItems={menuItems} categories={categories} />
                </div>

                {/* Meals List */}
                {meals.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                        <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No meals added for {mealTimeLabel.toLowerCase()}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {meals.map((meal, idx) => (
                            <MealItemCard
                                key={meal.id}
                                item={meal}
                                index={idx}
                                onRemove={() => onRemoveMeal(idx)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ============= DAY SCHEDULE CARD =============

interface DayScheduleCardProps {
    day: string
    schedule: DaySchedule
    onUpdateDay: (updatedSchedule: DaySchedule) => void
    isExpanded: boolean
    onToggleExpand: () => void
    menuItems: MenuItem[]
    categories: Category[]
}

function DayScheduleCard({ day, schedule, onUpdateDay, isExpanded, onToggleExpand, menuItems, categories }: DayScheduleCardProps) {
    const updateMealPeriodDescription = (mealTimeId: keyof DaySchedule['mealPeriodDescriptions'], field: keyof MealPeriodDescription, value: string) => {
        onUpdateDay({
            ...schedule,
            mealPeriodDescriptions: {
                ...schedule.mealPeriodDescriptions,
                [mealTimeId]: {
                    ...schedule.mealPeriodDescriptions[mealTimeId],
                    [field]: value,
                },
            },
        })
    }

    const addMeal = (mealTimeId: keyof DaySchedule['meals'], meal: MealItemWithDetails) => {
        onUpdateDay({
            ...schedule,
            meals: {
                ...schedule.meals,
                [mealTimeId]: [...schedule.meals[mealTimeId], meal],
            },
        })
    }

    const removeMeal = (mealTimeId: keyof DaySchedule['meals'], index: number) => {
        const updatedMeals = [...schedule.meals[mealTimeId]]
        updatedMeals.splice(index, 1)
        onUpdateDay({
            ...schedule,
            meals: {
                ...schedule.meals,
                [mealTimeId]: updatedMeals,
            },
        })
    }

    const calculateDailyTotals = () => {
        let calories = 0, protein = 0, carbs = 0, fat = 0
        Object.values(schedule.meals).flat().forEach(meal => {
            calories += meal.nutrition.calories
            protein += meal.nutrition.protein
            carbs += meal.nutrition.carbs
            fat += meal.nutrition.fat
        })
        return { calories, protein, carbs, fat }
    }

    const dailyTotals = calculateDailyTotals()

    return (
        <Card className={cn("overflow-hidden transition-all duration-300 border", isExpanded ? "shadow-xl ring-1 ring-green-200" : "shadow-md")}>
            <div
                className={cn("flex justify-between items-center p-4 cursor-pointer transition-colors", "bg-gradient-to-r from-gray-50 to-white")}
                onClick={onToggleExpand}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{day}</h3>
                        <div className="flex gap-3 text-xs text-gray-500">
                            <span>🔥 {dailyTotals.calories} kcal</span>
                            <span>💪 {dailyTotals.protein}g</span>
                            <span>🍚 {dailyTotals.carbs}g</span>
                            <span>🧈 {dailyTotals.fat}g</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {Object.values(schedule.meals).flat().length} meals
                    </Badge>
                    <ChevronRight className={cn("w-5 h-5 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                        <CardContent className="p-4 space-y-4 border-t">
                            {MEAL_TIMES.map((mealTime) => (
                                <MealPeriodSection
                                    key={mealTime.id}
                                    mealTimeId={mealTime.id as any}
                                    mealTimeLabel={mealTime.label}
                                    mealTimeIcon={mealTime.icon}
                                    mealTimeTime={mealTime.time}
                                    mealTimeColor={mealTime.color}
                                    mealTimeImportance={mealTime.importance}
                                    mealTimeBenefits={mealTime.benefits}
                                    description={schedule.mealPeriodDescriptions[mealTime.id as keyof DaySchedule['mealPeriodDescriptions']]}
                                    onDescriptionChange={(field, value) => updateMealPeriodDescription(mealTime.id as keyof DaySchedule['mealPeriodDescriptions'], field, value)}
                                    meals={schedule.meals[mealTime.id as keyof DaySchedule['meals']]}
                                    onAddMeal={(meal) => addMeal(mealTime.id as keyof DaySchedule['meals'], meal)}
                                    onRemoveMeal={(index) => removeMeal(mealTime.id as keyof DaySchedule['meals'], index)}
                                    menuItems={menuItems}
                                    categories={categories}
                                />
                            ))}

                            {/* Daily Summary */}
                            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-green-600" />
                                    Daily Nutrition Summary
                                </h4>
                                <div className="grid grid-cols-4 gap-3 text-center">
                                    <div className="p-2 bg-white rounded-lg">
                                        <p className="text-xs text-gray-500">Total Calories</p>
                                        <p className="text-lg font-bold text-green-700">{dailyTotals.calories}</p>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg">
                                        <p className="text-xs text-gray-500">Protein</p>
                                        <p className="text-lg font-bold text-blue-700">{dailyTotals.protein}g</p>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg">
                                        <p className="text-xs text-gray-500">Carbs</p>
                                        <p className="text-lg font-bold text-yellow-700">{dailyTotals.carbs}g</p>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg">
                                        <p className="text-xs text-gray-500">Fat</p>
                                        <p className="text-lg font-bold text-orange-700">{dailyTotals.fat}g</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    )
}

// ============= MAIN COMPONENT =============

interface MealPlannerProps {
    isOpen: boolean
    onClose: () => void
    menuItems?: MenuItem[]
    categories?: Category[]
}

export function MealPlanner({ isOpen, onClose, menuItems = [], categories = [] }: MealPlannerProps) {
    const [activeTab, setActiveTab] = useState('create')
    const [templates, setTemplates] = useState<MealPlanTemplate[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [dailySchedules, setDailySchedules] = useState<Record<string, DaySchedule>>({})
    const [expandedDay, setExpandedDay] = useState<string | null>('Monday')
    const [currentTemplate, setCurrentTemplate] = useState<Partial<MealPlanTemplate>>({
        templateCode: generateTemplateCode(),
        name: '',
        description: '',
        criteria: {
            minAge: 18, maxAge: 30,
            minWeight: 50, maxWeight: 70,
            minHeight: 150, maxHeight: 170,
            gender: 'any',
            fitnessGoal: 'fatLoss',
            activityLevel: 'moderate',
        },
        nutritionalTargets: { dailyCalories: 2000, dailyProtein: 150, dailyCarbs: 200, dailyFat: 65, dailyWater: 2500 },
        mealPrepTips: [],
        groceryTips: [],
        notesForClient: '',
        status: 'active',
        usageCount: 0,
    })

    // Fetch existing templates when dialog opens
    useEffect(() => {
        if (isOpen) {
            fetchTemplates()
        }
    }, [isOpen])

    // Initialize schedules
    useEffect(() => {
        const schedules: Record<string, DaySchedule> = {}
        DAYS.forEach(day => { schedules[day] = createEmptyDaySchedule(day) })
        setDailySchedules(schedules)
    }, [])

    const fetchTemplates = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/meal-planner/templates')
            const data = await response.json()
            if (data.success) {
                setTemplates(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching templates:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const updateDaySchedule = (day: string, updatedSchedule: DaySchedule) => {
        setDailySchedules(prev => ({ ...prev, [day]: updatedSchedule }))
    }

    const calculateWeeklyTotals = () => {
        let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalMeals = 0
        Object.values(dailySchedules).forEach(day => {
            Object.values(day.meals).flat().forEach(meal => {
                totalCalories += meal.nutrition.calories
                totalProtein += meal.nutrition.protein
                totalCarbs += meal.nutrition.carbs
                totalFat += meal.nutrition.fat
                totalMeals++
            })
        })
        return {
            avgCalories: Math.round(totalCalories / 7),
            avgProtein: Math.round(totalProtein / 7),
            avgCarbs: Math.round(totalCarbs / 7),
            avgFat: Math.round(totalFat / 7),
            totalMeals,
        }
    }

    const totals = calculateWeeklyTotals()

    const saveTemplate = async () => {
        // Validation
        if (!currentTemplate.name) {
            toast.error("Please enter a template name")
            return
        }

        // Check if any meals are added
        const hasAnyMeals = Object.values(dailySchedules).some(day => 
            Object.values(day.meals).some(meals => meals.length > 0)
        )
        
        if (!hasAnyMeals) {
            toast.warning("No meals added to the schedule. Please add at least one meal before saving.")
            return
        }

        setIsSaving(true)
        try {
            const templateData = {
                templateCode: currentTemplate.templateCode,
                name: currentTemplate.name,
                description: currentTemplate.description || "",
                criteria: currentTemplate.criteria,
                nutritionalTargets: currentTemplate.nutritionalTargets,
                weeklySchedule: dailySchedules,
                mealPrepTips: (currentTemplate.mealPrepTips || []).filter(tip => tip.trim() !== ""),
                groceryTips: (currentTemplate.groceryTips || []).filter(tip => tip.trim() !== ""),
                notesForClient: currentTemplate.notesForClient || "",
                status: 'active',
                usageCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            console.log("Saving template data:", JSON.stringify(templateData, null, 2))

            const response = await fetch('/api/meal-planner/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templateData),
            })

            const data = await response.json()

            if (data.success) {
                toast.success(`Template "${currentTemplate.name}" created successfully!`)
                
                // Refresh templates list
                await fetchTemplates()
                
                // Reset form for next template
                const newSchedules: Record<string, DaySchedule> = {}
                DAYS.forEach(day => { newSchedules[day] = createEmptyDaySchedule(day) })
                setDailySchedules(newSchedules)
                setCurrentTemplate({
                    templateCode: generateTemplateCode(),
                    name: '',
                    description: '',
                    criteria: {
                        minAge: 18, maxAge: 30,
                        minWeight: 50, maxWeight: 70,
                        minHeight: 150, maxHeight: 170,
                        gender: 'any',
                        fitnessGoal: 'fatLoss',
                        activityLevel: 'moderate',
                    },
                    nutritionalTargets: { dailyCalories: 2000, dailyProtein: 150, dailyCarbs: 200, dailyFat: 65, dailyWater: 2500 },
                    mealPrepTips: [],
                    groceryTips: [],
                    notesForClient: '',
                    status: 'active',
                    usageCount: 0,
                })
                setExpandedDay('Monday')
                
                // Switch to templates tab to show the newly created template
                setActiveTab('templates')
            } else {
                throw new Error(data.message || "Failed to save template")
            }
        } catch (error: any) {
            console.error('Error saving template:', error)
            toast.error(error.message || "Failed to save template. Please check the console for details.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-white p-0">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-green-600" />
                        Meal Plan Template Studio
                    </DialogTitle>
                    <DialogDescription className="text-gray-500 text-sm">
                        Create reusable meal plan templates based on criteria (age, weight, height, goal)
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden px-6">
                    <TabsList className="grid w-full grid-cols-2 mb-3 shrink-0">
                        <TabsTrigger value="create" className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Create Template</TabsTrigger>
                        <TabsTrigger value="templates" className="flex items-center gap-2 text-sm"><ClipboardList className="w-4 h-4" />Template Library ({templates.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="create" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden flex flex-col">
                        <ScrollArea className="flex-1 pr-3">
                            <div className="space-y-4 pb-4">
                                {/* Template Basic Info */}
                                <Card>
                                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 py-3">
                                        <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Template Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><Label className="text-xs">Template Code</Label><Input value={currentTemplate.templateCode} disabled className="bg-gray-50 font-mono text-xs h-9" /></div>
                                            <div><Label className="text-xs">Template Name *</Label><Input placeholder="e.g., Fat Loss - Beginner" value={currentTemplate.name} onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })} className="h-9 text-sm" /></div>
                                        </div>
                                        <Textarea placeholder="Template description..." value={currentTemplate.description} onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })} rows={2} className="text-sm" />
                                    </CardContent>
                                </Card>

                                {/* Target Criteria */}
                                <Card>
                                    <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 py-3">
                                        <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />Target Criteria</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                            <div><Label className="text-xs">Min Age</Label><Input type="number" value={currentTemplate.criteria?.minAge} onChange={(e) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, minAge: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Max Age</Label><Input type="number" value={currentTemplate.criteria?.maxAge} onChange={(e) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, maxAge: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Min Weight</Label><Input type="number" value={currentTemplate.criteria?.minWeight} onChange={(e) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, minWeight: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Max Weight</Label><Input type="number" value={currentTemplate.criteria?.maxWeight} onChange={(e) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, maxWeight: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Min Height</Label><Input type="number" value={currentTemplate.criteria?.minHeight} onChange={(e) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, minHeight: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Max Height</Label><Input type="number" value={currentTemplate.criteria?.maxHeight} onChange={(e) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, maxHeight: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Gender</Label><Select value={currentTemplate.criteria?.gender} onValueChange={(v: any) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, gender: v } })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select></div>
                                            <div><Label className="text-xs">Fitness Goal</Label><Select value={currentTemplate.criteria?.fitnessGoal} onValueChange={(v) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, fitnessGoal: v } })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{FITNESS_GOALS.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}</SelectContent></Select></div>
                                            <div><Label className="text-xs">Activity Level</Label><Select value={currentTemplate.criteria?.activityLevel} onValueChange={(v) => setCurrentTemplate({ ...currentTemplate, criteria: { ...currentTemplate.criteria!, activityLevel: v } })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{ACTIVITY_LEVELS.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}</SelectContent></Select></div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Nutritional Targets */}
                                <Card>
                                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 py-3">
                                        <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" />Daily Nutritional Targets</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3">
                                        <div className="grid grid-cols-5 gap-2">
                                            <div><Label className="text-xs">Calories</Label><Input type="number" value={currentTemplate.nutritionalTargets?.dailyCalories} onChange={(e) => setCurrentTemplate({ ...currentTemplate, nutritionalTargets: { ...currentTemplate.nutritionalTargets!, dailyCalories: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Protein (g)</Label><Input type="number" value={currentTemplate.nutritionalTargets?.dailyProtein} onChange={(e) => setCurrentTemplate({ ...currentTemplate, nutritionalTargets: { ...currentTemplate.nutritionalTargets!, dailyProtein: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Carbs (g)</Label><Input type="number" value={currentTemplate.nutritionalTargets?.dailyCarbs} onChange={(e) => setCurrentTemplate({ ...currentTemplate, nutritionalTargets: { ...currentTemplate.nutritionalTargets!, dailyCarbs: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Fat (g)</Label><Input type="number" value={currentTemplate.nutritionalTargets?.dailyFat} onChange={(e) => setCurrentTemplate({ ...currentTemplate, nutritionalTargets: { ...currentTemplate.nutritionalTargets!, dailyFat: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                            <div><Label className="text-xs">Water (ml)</Label><Input type="number" value={currentTemplate.nutritionalTargets?.dailyWater} onChange={(e) => setCurrentTemplate({ ...currentTemplate, nutritionalTargets: { ...currentTemplate.nutritionalTargets!, dailyWater: parseInt(e.target.value) || 0 } })} className="h-9 text-sm" /></div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Weekly Schedule */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-sm font-semibold flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-green-600" />
                                            Weekly Meal Schedule
                                        </h2>
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                            {totals.totalMeals} meals | {totals.avgCalories} avg kcal
                                        </Badge>
                                    </div>
                                    <div className="space-y-3">
                                        {DAYS.map((day) => (
                                            <DayScheduleCard
                                                key={day}
                                                day={day}
                                                schedule={dailySchedules[day]}
                                                onUpdateDay={(updated) => updateDaySchedule(day, updated)}
                                                isExpanded={expandedDay === day}
                                                onToggleExpand={() => setExpandedDay(expandedDay === day ? null : day)}
                                                menuItems={menuItems}
                                                categories={categories}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Tips */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Card>
                                        <CardHeader className="py-2"><CardTitle className="text-sm flex items-center gap-2"><ListChecks className="w-4 h-4" />Meal Prep Tips</CardTitle></CardHeader>
                                        <CardContent className="p-3 space-y-2">
                                            {(currentTemplate.mealPrepTips || []).map((tip, idx) => (
                                                <div key={idx} className="flex gap-2"><Input value={tip} onChange={(e) => { const newTips = [...(currentTemplate.mealPrepTips || [])]; newTips[idx] = e.target.value; setCurrentTemplate({ ...currentTemplate, mealPrepTips: newTips }); }} className="h-8 text-sm" /><Button variant="ghost" size="icon" onClick={() => setCurrentTemplate({ ...currentTemplate, mealPrepTips: (currentTemplate.mealPrepTips || []).filter((_, i) => i !== idx) })}><X className="w-3 h-3" /></Button></div>
                                            ))}
                                            <Button variant="outline" size="sm" onClick={() => setCurrentTemplate({ ...currentTemplate, mealPrepTips: [...(currentTemplate.mealPrepTips || []), ""] })}><Plus className="w-3 h-3 mr-1" />Add Tip</Button>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="py-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Grocery Tips</CardTitle></CardHeader>
                                        <CardContent className="p-3 space-y-2">
                                            {(currentTemplate.groceryTips || []).map((tip, idx) => (
                                                <div key={idx} className="flex gap-2"><Input value={tip} onChange={(e) => { const newTips = [...(currentTemplate.groceryTips || [])]; newTips[idx] = e.target.value; setCurrentTemplate({ ...currentTemplate, groceryTips: newTips }); }} className="h-8 text-sm" /><Button variant="ghost" size="icon" onClick={() => setCurrentTemplate({ ...currentTemplate, groceryTips: (currentTemplate.groceryTips || []).filter((_, i) => i !== idx) })}><X className="w-3 h-3" /></Button></div>
                                            ))}
                                            <Button variant="outline" size="sm" onClick={() => setCurrentTemplate({ ...currentTemplate, groceryTips: [...(currentTemplate.groceryTips || []), ""] })}><Plus className="w-3 h-3 mr-1" />Add Tip</Button>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Notes */}
                                <Card>
                                    <CardHeader className="py-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Notes for Client</CardTitle></CardHeader>
                                    <CardContent className="p-3"><Textarea rows={2} placeholder="Add any general notes..." value={currentTemplate.notesForClient} onChange={(e) => setCurrentTemplate({ ...currentTemplate, notesForClient: e.target.value })} className="text-sm" /></CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="templates" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden flex flex-col">
                        <ScrollArea className="flex-1 pr-3">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-12">
                                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No templates created yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Click "Create Template" to get started</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {templates.map((template) => (
                                        <Card key={template._id} className="hover:shadow-lg transition-shadow">
                                            <CardHeader className="bg-gradient-to-r from-gray-50 to-white py-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <CardTitle className="text-base">{template.name}</CardTitle>
                                                        <p className="text-xs text-gray-500 font-mono">{template.templateCode}</p>
                                                    </div>
                                                    <Badge className="text-xs">{template.status}</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-3">
                                                <p className="text-sm text-gray-600 mb-2 line-clamp-1">{template.description || "No description"}</p>
                                                <div className="grid grid-cols-5 gap-1 text-xs mb-2">
                                                    <div className="text-center p-1 bg-gray-50 rounded"><span className="text-gray-500">Age</span><br /><span className="font-semibold">{template.criteria.minAge}-{template.criteria.maxAge}</span></div>
                                                    <div className="text-center p-1 bg-gray-50 rounded"><span className="text-gray-500">Weight</span><br /><span className="font-semibold">{template.criteria.minWeight}-{template.criteria.maxWeight}kg</span></div>
                                                    <div className="text-center p-1 bg-gray-50 rounded"><span className="text-gray-500">Height</span><br /><span className="font-semibold">{template.criteria.minHeight}-{template.criteria.maxHeight}cm</span></div>
                                                    <div className="text-center p-1 bg-gray-50 rounded"><span className="text-gray-500">Goal</span><br /><span className="font-semibold">{FITNESS_GOALS.find(g => g.id === template.criteria.fitnessGoal)?.label}</span></div>
                                                    <div className="text-center p-1 bg-gray-50 rounded"><span className="text-gray-500">Uses</span><br /><span className="font-semibold">{template.usageCount}</span></div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" className="text-xs">View Details</Button>
                                                    <Button variant="outline" size="sm" className="text-xs">Use Template</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-auto p-6 pt-3 border-t shrink-0">
                    <Button variant="outline" onClick={onClose} size="sm">
                        {activeTab === 'create' ? 'Cancel' : 'Close'}
                    </Button>
                    {activeTab === 'create' && (
                        <Button onClick={saveTemplate} disabled={isSaving || !currentTemplate.name} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                            {isSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                            {isSaving ? "Saving..." : "Save Template"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
