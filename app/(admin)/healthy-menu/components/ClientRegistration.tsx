"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Mail, Phone, Calendar, Heart, Activity, Apple, AlertCircle, Scale, Ruler, Clock, Coffee, Moon, Zap, Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from "@/lib/utils"

interface ClientRegistrationProps {
  isOpen: boolean
  onClose: () => void
  onClientRegistered: (client: any) => void
}

export function ClientRegistration({ isOpen, onClose, onClientRegistered }: ClientRegistrationProps) {
  const [activeTab, setActiveTab] = useState('personal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [client, setClient] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'female',
    height: '',
    weight: '',
    medicalConditions: [] as string[],
    allergies: [] as string[],
    dietaryRestrictions: [] as string[],
    medications: '',
    primaryGoal: 'weightLoss',
    targetWeight: '',
    activityLevel: 'moderate',
    sleepHours: '7',
    stressLevel: '3',
    waterIntake: '8',
    preferredCuisines: [] as string[],
    dislikedFoods: '',
    mealPreferences: {
      mealsPerDay: '3',
      breakfastTime: '08:00',
      lunchTime: '13:00',
      dinnerTime: '19:00',
    },
    notes: '',
  })

  const [bmi, setBmi] = useState<number | null>(null)
  const [bmiCategory, setBmiCategory] = useState('')

  // Calculate BMI
  const calculateBMI = () => {
    if (client.height && client.weight) {
      const heightInMeters = parseFloat(client.height) / 100
      const weightInKg = parseFloat(client.weight)
      const bmiValue = weightInKg / (heightInMeters * heightInMeters)
      setBmi(parseFloat(bmiValue.toFixed(1)))
      
      if (bmiValue < 18.5) setBmiCategory('Underweight')
      else if (bmiValue < 25) setBmiCategory('Normal weight')
      else if (bmiValue < 30) setBmiCategory('Overweight')
      else setBmiCategory('Obese')
    }
  }

  React.useEffect(() => {
    calculateBMI()
  }, [client.height, client.weight])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const clientData = {
        ...client,
        clientId: `CLT-${Date.now()}`,
        age: calculateAge(client.dateOfBirth),
        bmi: bmi || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      }

      const response = await fetch('/api/meal-planner/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Client registered successfully!')
        onClientRegistered(result.data)
        onClose()
        // Reset form
        setClient({
          fullName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          gender: 'female',
          height: '',
          weight: '',
          medicalConditions: [],
          allergies: [],
          dietaryRestrictions: [],
          medications: '',
          primaryGoal: 'weightLoss',
          targetWeight: '',
          activityLevel: 'moderate',
          sleepHours: '7',
          stressLevel: '3',
          waterIntake: '8',
          preferredCuisines: [],
          dislikedFoods: '',
          mealPreferences: {
            mealsPerDay: '3',
            breakfastTime: '08:00',
            lunchTime: '13:00',
            dinnerTime: '19:00',
          },
          notes: '',
        })
      } else {
        throw new Error('Failed to register client')
      }
    } catch (error) {
      console.error('Error registering client:', error)
      toast.error('Failed to register client')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateAge = (dob: string) => {
    if (!dob) return 0
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="w-6 h-6 text-green-600" />
            Register New Client
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive client profile for personalized meal planning
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="health">Health Metrics</TabsTrigger>
            <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] pr-4">
            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={client.fullName}
                      onChange={(e) => setClient({ ...client, fullName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={client.email}
                      onChange={(e) => setClient({ ...client, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      value={client.phone}
                      onChange={(e) => setClient({ ...client, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={client.dateOfBirth}
                      onChange={(e) => setClient({ ...client, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={client.gender} onValueChange={(v) => setClient({ ...client, gender: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Physical Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Height (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={client.height}
                        onChange={(e) => setClient({ ...client, height: e.target.value })}
                        placeholder="170"
                      />
                    </div>
                    <div>
                      <Label>Weight (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={client.weight}
                        onChange={(e) => setClient({ ...client, weight: e.target.value })}
                        placeholder="70"
                      />
                    </div>
                  </div>

                  {bmi && (
                    <div className={cn(
                      "p-4 rounded-lg",
                      bmiCategory === 'Normal weight' ? "bg-green-50 border-green-200" :
                      bmiCategory === 'Overweight' ? "bg-yellow-50 border-yellow-200" :
                      "bg-red-50 border-red-200"
                    )}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">BMI: {bmi}</p>
                          <p className="text-sm">{bmiCategory}</p>
                        </div>
                        <Scale className="w-8 h-8 opacity-50" />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Primary Health Goal</Label>
                    <Select value={client.primaryGoal} onValueChange={(v) => setClient({ ...client, primaryGoal: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weightLoss">Weight Loss</SelectItem>
                        <SelectItem value="weightGain">Weight Gain</SelectItem>
                        <SelectItem value="weightMaintenance">Weight Maintenance</SelectItem>
                        <SelectItem value="muscleGain">Muscle Gain</SelectItem>
                        <SelectItem value="improveHealth">Improve Overall Health</SelectItem>
                        <SelectItem value="sportsPerformance">Sports Performance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Target Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={client.targetWeight}
                      onChange={(e) => setClient({ ...client, targetWeight: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <Label>Medical Conditions</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['diabetes', 'hypertension', 'highCholesterol', 'thyroid', 'pcod', 'heartDisease', 'kidneyDisease', 'none'].map(condition => (
                        <Badge
                          key={condition}
                          className={cn(
                            "cursor-pointer",
                            client.medicalConditions.includes(condition) ? "bg-red-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          )}
                          onClick={() => {
                            if (client.medicalConditions.includes(condition)) {
                              setClient({ ...client, medicalConditions: client.medicalConditions.filter(c => c !== condition) })
                            } else {
                              setClient({ ...client, medicalConditions: [...client.medicalConditions, condition] })
                            }
                          }}
                        >
                          {condition.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Allergies</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['nuts', 'dairy', 'eggs', 'soy', 'wheat', 'shellfish', 'fish', 'peanuts', 'none'].map(allergy => (
                        <Badge
                          key={allergy}
                          className={cn(
                            "cursor-pointer",
                            client.allergies.includes(allergy) ? "bg-orange-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          )}
                          onClick={() => {
                            if (client.allergies.includes(allergy)) {
                              setClient({ ...client, allergies: client.allergies.filter(a => a !== allergy) })
                            } else {
                              setClient({ ...client, allergies: [...client.allergies, allergy] })
                            }
                          }}
                        >
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Dietary Restrictions</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'keto', 'paleo', 'halal', 'kosher'].map(restriction => (
                        <Badge
                          key={restriction}
                          className={cn(
                            "cursor-pointer",
                            client.dietaryRestrictions.includes(restriction) ? "bg-purple-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          )}
                          onClick={() => {
                            if (client.dietaryRestrictions.includes(restriction)) {
                              setClient({ ...client, dietaryRestrictions: client.dietaryRestrictions.filter(r => r !== restriction) })
                            } else {
                              setClient({ ...client, dietaryRestrictions: [...client.dietaryRestrictions, restriction] })
                            }
                          }}
                        >
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Current Medications</Label>
                    <Textarea
                      value={client.medications}
                      onChange={(e) => setClient({ ...client, medications: e.target.value })}
                      placeholder="List any current medications"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lifestyle" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Lifestyle & Habits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Activity Level</Label>
                    <Select value={client.activityLevel} onValueChange={(v) => setClient({ ...client, activityLevel: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary (Little exercise)</SelectItem>
                        <SelectItem value="light">Lightly Active (1-3 days/week)</SelectItem>
                        <SelectItem value="moderate">Moderately Active (3-5 days/week)</SelectItem>
                        <SelectItem value="active">Very Active (6-7 days/week)</SelectItem>
                        <SelectItem value="veryActive">Super Active (Physical job + exercise)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Hours of Sleep</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={client.sleepHours}
                        onChange={(e) => setClient({ ...client, sleepHours: e.target.value })}
                        placeholder="7-9"
                      />
                    </div>
                    <div>
                      <Label>Water Intake (glasses/day)</Label>
                      <Input
                        type="number"
                        value={client.waterIntake}
                        onChange={(e) => setClient({ ...client, waterIntake: e.target.value })}
                        placeholder="8"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Stress Level (1-5)</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map(level => (
                        <Button
                          key={level}
                          type="button"
                          variant={parseInt(client.stressLevel) === level ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setClient({ ...client, stressLevel: level.toString() })}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Meal Timing Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Number of Meals per Day</Label>
                    <Select 
                      value={client.mealPreferences.mealsPerDay} 
                      onValueChange={(v) => setClient({ 
                        ...client, 
                        mealPreferences: { ...client.mealPreferences, mealsPerDay: v } 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Meals (Breakfast, Lunch, Dinner)</SelectItem>
                        <SelectItem value="4">4 Meals (+ Afternoon Snack)</SelectItem>
                        <SelectItem value="5">5 Meals (+ Morning & Afternoon Snacks)</SelectItem>
                        <SelectItem value="6">6 Meals (+ All Snacks)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Breakfast Time</Label>
                      <Input
                        type="time"
                        value={client.mealPreferences.breakfastTime}
                        onChange={(e) => setClient({ 
                          ...client, 
                          mealPreferences: { ...client.mealPreferences, breakfastTime: e.target.value } 
                        })}
                      />
                    </div>
                    <div>
                      <Label>Lunch Time</Label>
                      <Input
                        type="time"
                        value={client.mealPreferences.lunchTime}
                        onChange={(e) => setClient({ 
                          ...client, 
                          mealPreferences: { ...client.mealPreferences, lunchTime: e.target.value } 
                        })}
                      />
                    </div>
                    <div>
                      <Label>Dinner Time</Label>
                      <Input
                        type="time"
                        value={client.mealPreferences.dinnerTime}
                        onChange={(e) => setClient({ 
                          ...client, 
                          mealPreferences: { ...client.mealPreferences, dinnerTime: e.target.value } 
                        })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="w-5 h-5" />
                    Food Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Preferred Cuisines</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Italian', 'Chinese', 'Mexican', 'Indian', 'Japanese', 'Mediterranean', 'Thai', 'American', 'French'].map(cuisine => (
                        <Badge
                          key={cuisine}
                          className={cn(
                            "cursor-pointer",
                            client.preferredCuisines.includes(cuisine) ? "bg-green-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          )}
                          onClick={() => {
                            if (client.preferredCuisines.includes(cuisine)) {
                              setClient({ ...client, preferredCuisines: client.preferredCuisines.filter(c => c !== cuisine) })
                            } else {
                              setClient({ ...client, preferredCuisines: [...client.preferredCuisines, cuisine] })
                            }
                          }}
                        >
                          {cuisine}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Disliked Foods</Label>
                    <Textarea
                      value={client.dislikedFoods}
                      onChange={(e) => setClient({ ...client, dislikedFoods: e.target.value })}
                      placeholder="List foods the client dislikes"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={client.notes}
                      onChange={(e) => setClient({ ...client, notes: e.target.value })}
                      placeholder="Any additional information about the client"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !client.fullName || !client.email}>
            {isSubmitting ? 'Registering...' : 'Register Client'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}









// "use client"

// import React, { useState, useEffect } from 'react'
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Badge } from "@/components/ui/badge"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { Calendar, Clock, Activity, Heart, Scale, Apple, Coffee, Sun, Moon, Utensils, Plus, Trash2, Save, CalendarDays, User, Mail, Phone, AlertCircle, CheckCircle } from 'lucide-react'
// import { toast } from 'react-hot-toast'
// import { cn } from "@/lib/utils"
// import type { HealthyMenuItem } from '../page'

// interface MealPlannerProps {
//   isOpen: boolean
//   onClose: () => void
//   menuItems: HealthyMenuItem[]
//   categories: any[]
// }

// const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
// const MEAL_TIMES = [
//   { key: 'breakfast', label: 'Breakfast', icon: Coffee, time: '7:00 AM - 9:00 AM', recommended: '400-500 calories' },
//   { key: 'morningSnack', label: 'Morning Snack', icon: Apple, time: '10:00 AM - 11:00 AM', recommended: '150-200 calories' },
//   { key: 'lunch', label: 'Lunch', icon: Utensils, time: '12:00 PM - 2:00 PM', recommended: '500-600 calories' },
//   { key: 'afternoonSnack', label: 'Afternoon Snack', icon: Apple, time: '3:00 PM - 4:00 PM', recommended: '150-200 calories' },
//   { key: 'dinner', label: 'Dinner', icon: Sun, time: '6:00 PM - 8:00 PM', recommended: '500-600 calories' },
//   { key: 'eveningSnack', label: 'Evening Snack', icon: Moon, time: '8:30 PM - 9:30 PM', recommended: '100-150 calories' },
// ]

// const ACTIVITY_LEVELS = [
//   { value: 'sedentary', label: 'Sedentary (Little or no exercise)', multiplier: 1.2 },
//   { value: 'light', label: 'Lightly Active (Light exercise 1-3 days/week)', multiplier: 1.375 },
//   { value: 'moderate', label: 'Moderately Active (Moderate exercise 3-5 days/week)', multiplier: 1.55 },
//   { value: 'active', label: 'Very Active (Hard exercise 6-7 days/week)', multiplier: 1.725 },
//   { value: 'veryActive', label: 'Super Active (Very hard exercise & physical job)', multiplier: 1.9 },
// ]

// export function MealPlanner({ isOpen, onClose, menuItems, categories }: MealPlannerProps) {
//   const [step, setStep] = useState(1)
//   const [isSubmitting, setIsSubmitting] = useState(false)
//   const [mealPlan, setMealPlan] = useState<any>(null)
  
//   // User Registration Form
//   const [registration, setRegistration] = useState({
//     fullName: '',
//     email: '',
//     phone: '',
//     age: '',
//     weight: '',
//     height: '',
//     gender: 'female',
//     activityLevel: 'moderate',
//     healthGoals: [] as string[],
//     dietaryRestrictions: [] as string[],
//     allergies: [] as string[],
//     medicalConditions: '',
//     preferredCuisine: [] as string[],
//     budget: '',
//     startDate: '',
//     duration: '1',
//   })

//   // BMI Calculation
//   const [bmi, setBmi] = useState<number | null>(null)
//   const [bmiCategory, setBmiCategory] = useState('')
//   const [dailyCalories, setDailyCalories] = useState(0)

//   // Meal Plan Data
//   const [weeklyMeals, setWeeklyMeals] = useState<any>({})

//   useEffect(() => {
//     if (registration.weight && registration.height) {
//       const heightInMeters = parseFloat(registration.height) / 100
//       const weightInKg = parseFloat(registration.weight)
//       const bmiValue = weightInKg / (heightInMeters * heightInMeters)
//       setBmi(parseFloat(bmiValue.toFixed(1)))
      
//       if (bmiValue < 18.5) setBmiCategory('Underweight')
//       else if (bmiValue < 25) setBmiCategory('Normal weight')
//       else if (bmiValue < 30) setBmiCategory('Overweight')
//       else setBmiCategory('Obese')
      
//       // Calculate BMR using Mifflin-St Jeor Equation
//       let bmr = 0
//       const weight = weightInKg
//       const height = parseFloat(registration.height)
//       const age = parseFloat(registration.age)
      
//       if (registration.gender === 'male') {
//         bmr = 10 * weight + 6.25 * height - 5 * age + 5
//       } else {
//         bmr = 10 * weight + 6.25 * height - 5 * age - 161
//       }
      
//       const activityMultiplier = ACTIVITY_LEVELS.find(l => l.value === registration.activityLevel)?.multiplier || 1.55
//       const tdee = bmr * activityMultiplier
      
//       // Adjust based on goals
//       let calorieAdjustment = 0
//       if (registration.healthGoals.includes('weightLoss')) calorieAdjustment = -500
//       else if (registration.healthGoals.includes('weightGain')) calorieAdjustment = 500
      
//       setDailyCalories(Math.round(tdee + calorieAdjustment))
//     }
//   }, [registration.weight, registration.height, registration.gender, registration.age, registration.activityLevel, registration.healthGoals])

//   const calculateBMI = () => {
//     if (registration.weight && registration.height) {
//       const heightInMeters = parseFloat(registration.height) / 100
//       const weightInKg = parseFloat(registration.weight)
//       return (weightInKg / (heightInMeters * heightInMeters)).toFixed(1)
//     }
//     return null
//   }

//   const generateMealPlan = () => {
//     // Group menu items by category for easier selection
//     const itemsByCategory = menuItems.reduce((acc, item) => {
//       const category = categories.find(c => c._id === item.categoryId)?.name || 'Uncategorized'
//       if (!acc[category]) acc[category] = []
//       acc[category].push(item)
//       return acc
//     }, {} as Record<string, HealthyMenuItem[]>)

//     // Generate meal plan for each day
//     const plans: any = {}
    
//     DAYS.forEach(day => {
//       plans[day] = {
//         breakfast: { items: [], notes: '' },
//         morningSnack: { items: [], notes: '' },
//         lunch: { items: [], notes: '' },
//         afternoonSnack: { items: [], notes: '' },
//         dinner: { items: [], notes: '' },
//         eveningSnack: { items: [], notes: '' },
//       }
      
//       // Auto-select some healthy options based on dietary preferences
//       MEAL_TIMES.forEach(meal => {
//         const availableItems = menuItems.filter(item => {
//           // Filter based on dietary restrictions
//           if (registration.dietaryRestrictions.includes('vegetarian') && !item.dietaryInfo?.isVegetarian) return false
//           if (registration.dietaryRestrictions.includes('vegan') && !item.dietaryInfo?.isVegan) return false
//           if (registration.dietaryRestrictions.includes('glutenFree') && !item.dietaryInfo?.isGlutenFree) return false
//           return true
//         })
        
//         if (availableItems.length > 0) {
//           // Select random items based on meal type
//           let filteredItems = availableItems
//           if (meal.key === 'breakfast') {
//             filteredItems = availableItems.filter(i => i.name.toLowerCase().includes('oat') || i.name.toLowerCase().includes('egg') || i.name.toLowerCase().includes('smoothie'))
//           } else if (meal.key === 'lunch' || meal.key === 'dinner') {
//             filteredItems = availableItems.filter(i => i.nutritionalInfo?.protein && i.nutritionalInfo.protein > 15)
//           }
          
//           const selectedItems = filteredItems.length > 0 ? [filteredItems[Math.floor(Math.random() * filteredItems.length)]] : []
//           plans[day][meal.key].items = selectedItems
//         }
//       })
//     })
    
//     setWeeklyMeals(plans)
//     setStep(3)
//   }

//   const updateMealItem = (day: string, mealType: string, item: HealthyMenuItem | null) => {
//     setWeeklyMeals((prev: any) => ({
//       ...prev,
//       [day]: {
//         ...prev[day],
//         [mealType]: {
//           ...prev[day][mealType],
//           items: item ? [item] : []
//         }
//       }
//     }))
//   }

//   const calculateDayCalories = (dayMeals: any) => {
//     let total = 0
//     MEAL_TIMES.forEach(meal => {
//       dayMeals[meal.key]?.items.forEach((item: HealthyMenuItem) => {
//         total += item.nutritionalInfo?.calories || 0
//       })
//     })
//     return total
//   }

//   const submitMealPlan = async () => {
//     setIsSubmitting(true)
//     try {
//       const startDate = new Date(registration.startDate)
//       const endDate = new Date(startDate)
//       endDate.setDate(endDate.getDate() + (parseInt(registration.duration) * 7))
      
//       const dailyPlans = DAYS.map(day => {
//         const dayMeals = weeklyMeals[day]
//         return {
//           day,
//           date: new Date(startDate),
//           breakfast: { time: '7:00 AM', items: dayMeals.breakfast.items, notes: '' },
//           morningSnack: { time: '10:00 AM', items: dayMeals.morningSnack.items, notes: '' },
//           lunch: { time: '12:30 PM', items: dayMeals.lunch.items, notes: '' },
//           afternoonSnack: { time: '3:30 PM', items: dayMeals.afternoonSnack.items, notes: '' },
//           dinner: { time: '7:00 PM', items: dayMeals.dinner.items, notes: '' },
//           eveningSnack: { time: '9:00 PM', items: dayMeals.eveningSnack.items, notes: '' },
//           totalCalories: calculateDayCalories(dayMeals),
//           totalProtein: 0,
//           totalCarbs: 0,
//           totalFat: 0,
//         }
//       })
      
//       const planData = {
//         userName: registration.fullName,
//         userEmail: registration.email,
//         startDate,
//         endDate,
//         dailyPlans,
//         healthMetrics: {
//           age: parseInt(registration.age),
//           weight: parseFloat(registration.weight),
//           height: parseFloat(registration.height),
//           bmi: bmi || 0,
//           activityLevel: registration.activityLevel,
//           dietaryRestrictions: registration.dietaryRestrictions,
//           allergies: registration.allergies,
//           healthGoals: registration.healthGoals,
//           dailyCalorieTarget: dailyCalories,
//         },
//         status: 'active',
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       }
      
//       const response = await fetch('/api/meal-plans', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(planData),
//       })
      
//       if (response.ok) {
//         toast.success('Meal plan created successfully!')
//         onClose()
//         setStep(1)
//         // Reset form
//         setRegistration({
//           fullName: '',
//           email: '',
//           phone: '',
//           age: '',
//           weight: '',
//           height: '',
//           gender: 'female',
//           activityLevel: 'moderate',
//           healthGoals: [],
//           dietaryRestrictions: [],
//           allergies: [],
//           medicalConditions: '',
//           preferredCuisine: [],
//           budget: '',
//           startDate: '',
//           duration: '1',
//         })
//       } else {
//         throw new Error('Failed to create meal plan')
//       }
//     } catch (error) {
//       console.error('Error creating meal plan:', error)
//       toast.error('Failed to create meal plan')
//     } finally {
//       setIsSubmitting(false)
//     }
//   }

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
//         <DialogHeader>
//           <DialogTitle className="text-2xl flex items-center gap-2">
//             <CalendarDays className="w-6 h-6 text-green-600" />
//             Weekly Meal Planner
//           </DialogTitle>
//           <DialogDescription>
//             Create a personalized weekly meal plan based on your health metrics and dietary preferences
//           </DialogDescription>
//         </DialogHeader>

//         <div className="flex justify-between mb-6">
//           {[1, 2, 3].map((s) => (
//             <div
//               key={s}
//               className={cn(
//                 "flex-1 text-center pb-2 border-b-2 transition-colors",
//                 step >= s ? "border-green-500 text-green-600" : "border-gray-200 text-gray-400"
//               )}
//             >
//               Step {s}: {s === 1 ? "Health Profile" : s === 2 ? "Meal Selection" : "Review & Confirm"}
//             </div>
//           ))}
//         </div>

//         <ScrollArea className="h-[70vh] pr-4">
//           {step === 1 && (
//             <div className="space-y-6">
//               {/* Personal Information */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <User className="w-5 h-5" />
//                     Personal Information
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="grid grid-cols-2 gap-4">
//                   <div>
//                     <Label>Full Name *</Label>
//                     <Input
//                       value={registration.fullName}
//                       onChange={(e) => setRegistration({ ...registration, fullName: e.target.value })}
//                       placeholder="John Doe"
//                     />
//                   </div>
//                   <div>
//                     <Label>Email *</Label>
//                     <Input
//                       type="email"
//                       value={registration.email}
//                       onChange={(e) => setRegistration({ ...registration, email: e.target.value })}
//                       placeholder="john@example.com"
//                     />
//                   </div>
//                   <div>
//                     <Label>Phone *</Label>
//                     <Input
//                       value={registration.phone}
//                       onChange={(e) => setRegistration({ ...registration, phone: e.target.value })}
//                       placeholder="+1 234 567 8900"
//                     />
//                   </div>
//                   <div>
//                     <Label>Start Date *</Label>
//                     <Input
//                       type="date"
//                       value={registration.startDate}
//                       onChange={(e) => setRegistration({ ...registration, startDate: e.target.value })}
//                     />
//                   </div>
//                   <div>
//                     <Label>Duration (weeks)</Label>
//                     <Select value={registration.duration} onValueChange={(v) => setRegistration({ ...registration, duration: v })}>
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {[1, 2, 3, 4].map(w => (
//                           <SelectItem key={w} value={w.toString()}>{w} week{w > 1 ? 's' : ''}</SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div>
//                     <Label>Budget (USD/week)</Label>
//                     <Input
//                       type="number"
//                       value={registration.budget}
//                       onChange={(e) => setRegistration({ ...registration, budget: e.target.value })}
//                       placeholder="100"
//                     />
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Health Metrics */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <Heart className="w-5 h-5 text-red-500" />
//                     Health Metrics
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div className="grid grid-cols-3 gap-4">
//                     <div>
//                       <Label>Age *</Label>
//                       <Input
//                         type="number"
//                         value={registration.age}
//                         onChange={(e) => setRegistration({ ...registration, age: e.target.value })}
//                         placeholder="25"
//                       />
//                     </div>
//                     <div>
//                       <Label>Weight (kg) *</Label>
//                       <Input
//                         type="number"
//                         step="0.1"
//                         value={registration.weight}
//                         onChange={(e) => setRegistration({ ...registration, weight: e.target.value })}
//                         placeholder="70"
//                       />
//                     </div>
//                     <div>
//                       <Label>Height (cm) *</Label>
//                       <Input
//                         type="number"
//                         value={registration.height}
//                         onChange={(e) => setRegistration({ ...registration, height: e.target.value })}
//                         placeholder="170"
//                       />
//                     </div>
//                   </div>

//                   {bmi && (
//                     <div className={cn(
//                       "p-4 rounded-lg",
//                       bmiCategory === 'Normal weight' ? "bg-green-50 border-green-200" :
//                       bmiCategory === 'Overweight' ? "bg-yellow-50 border-yellow-200" :
//                       "bg-red-50 border-red-200"
//                     )}>
//                       <div className="flex justify-between items-center">
//                         <div>
//                           <p className="text-sm font-medium">Your BMI: {bmi}</p>
//                           <p className="text-sm">{bmiCategory}</p>
//                         </div>
//                         <div>
//                           <p className="text-sm font-medium">Daily Calorie Target</p>
//                           <p className="text-2xl font-bold">{dailyCalories} kcal</p>
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   <div className="grid grid-cols-2 gap-4">
//                     <div>
//                       <Label>Gender</Label>
//                       <Select value={registration.gender} onValueChange={(v) => setRegistration({ ...registration, gender: v as any })}>
//                         <SelectTrigger>
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="female">Female</SelectItem>
//                           <SelectItem value="male">Male</SelectItem>
//                           <SelectItem value="other">Other</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>
//                     <div>
//                       <Label>Activity Level</Label>
//                       <Select value={registration.activityLevel} onValueChange={(v) => setRegistration({ ...registration, activityLevel: v })}>
//                         <SelectTrigger>
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {ACTIVITY_LEVELS.map(level => (
//                             <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                   </div>

//                   <div>
//                     <Label>Health Goals (Select multiple)</Label>
//                     <div className="flex flex-wrap gap-2 mt-2">
//                       {['weightLoss', 'weightMaintenance', 'weightGain', 'muscleGain', 'generalHealth'].map(goal => (
//                         <Badge
//                           key={goal}
//                           className={cn(
//                             "cursor-pointer",
//                             registration.healthGoals.includes(goal) ? "bg-green-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                           )}
//                           onClick={() => {
//                             if (registration.healthGoals.includes(goal)) {
//                               setRegistration({ ...registration, healthGoals: registration.healthGoals.filter(g => g !== goal) })
//                             } else {
//                               setRegistration({ ...registration, healthGoals: [...registration.healthGoals, goal] })
//                             }
//                           }}
//                         >
//                           {goal.replace(/([A-Z])/g, ' $1').trim()}
//                         </Badge>
//                       ))}
//                     </div>
//                   </div>

//                   <div>
//                     <Label>Dietary Restrictions</Label>
//                     <div className="flex flex-wrap gap-2 mt-2">
//                       {['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'keto', 'paleo'].map(restriction => (
//                         <Badge
//                           key={restriction}
//                           className={cn(
//                             "cursor-pointer",
//                             registration.dietaryRestrictions.includes(restriction) ? "bg-green-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                           )}
//                           onClick={() => {
//                             if (registration.dietaryRestrictions.includes(restriction)) {
//                               setRegistration({ ...registration, dietaryRestrictions: registration.dietaryRestrictions.filter(r => r !== restriction) })
//                             } else {
//                               setRegistration({ ...registration, dietaryRestrictions: [...registration.dietaryRestrictions, restriction] })
//                             }
//                           }}
//                         >
//                           {restriction}
//                         </Badge>
//                       ))}
//                     </div>
//                   </div>

//                   <div>
//                     <Label>Allergies</Label>
//                     <div className="flex flex-wrap gap-2 mt-2">
//                       {['nuts', 'dairy', 'eggs', 'soy', 'wheat', 'shellfish', 'fish'].map(allergy => (
//                         <Badge
//                           key={allergy}
//                           className={cn(
//                             "cursor-pointer",
//                             registration.allergies.includes(allergy) ? "bg-red-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                           )}
//                           onClick={() => {
//                             if (registration.allergies.includes(allergy)) {
//                               setRegistration({ ...registration, allergies: registration.allergies.filter(a => a !== allergy) })
//                             } else {
//                               setRegistration({ ...registration, allergies: [...registration.allergies, allergy] })
//                             }
//                           }}
//                         >
//                           {allergy}
//                         </Badge>
//                       ))}
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>

//               <div className="flex justify-end">
//                 <Button onClick={() => setStep(2)} disabled={!registration.fullName || !registration.email || !registration.age || !registration.weight || !registration.height}>
//                   Continue to Meal Selection →
//                 </Button>
//               </div>
//             </div>
//           )}

//           {step === 2 && (
//             <div className="space-y-6">
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Recommended Daily Calorie Intake: {dailyCalories} kcal</CardTitle>
//                 </CardHeader>
//               </Card>

//               <Tabs defaultValue="Monday" className="w-full">
//                 <TabsList className="grid grid-cols-7 w-full">
//                   {DAYS.map(day => (
//                     <TabsTrigger key={day} value={day}>{day.substring(0, 3)}</TabsTrigger>
//                   ))}
//                 </TabsList>

//                 {DAYS.map(day => (
//                   <TabsContent key={day} value={day} className="space-y-4 mt-4">
//                     {MEAL_TIMES.map(meal => {
//                       const MealIcon = meal.icon
//                       const currentItems = weeklyMeals[day]?.[meal.key]?.items || []
                      
//                       return (
//                         <Card key={meal.key}>
//                           <CardHeader className="pb-2">
//                             <CardTitle className="text-lg flex items-center justify-between">
//                               <div className="flex items-center gap-2">
//                                 <MealIcon className="w-5 h-5" />
//                                 {meal.label}
//                                 <span className="text-sm font-normal text-gray-500">({meal.time})</span>
//                               </div>
//                               <Badge variant="outline">{meal.recommended}</Badge>
//                             </CardTitle>
//                           </CardHeader>
//                           <CardContent>
//                             {currentItems.length > 0 ? (
//                               <div className="space-y-2">
//                                 {currentItems.map((item: HealthyMenuItem) => (
//                                   <div key={item._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
//                                     <div>
//                                       <p className="font-medium">{item.name}</p>
//                                       <p className="text-sm text-gray-500">{item.nutritionalInfo?.calories} cal</p>
//                                     </div>
//                                     <Button
//                                       variant="ghost"
//                                       size="sm"
//                                       onClick={() => updateMealItem(day, meal.key, null)}
//                                     >
//                                       <Trash2 className="w-4 h-4 text-red-500" />
//                                     </Button>
//                                   </div>
//                                 ))}
//                               </div>
//                             ) : (
//                               <div className="text-center py-4 text-gray-500">
//                                 No meal selected for this time
//                               </div>
//                             )}
                            
//                             <div className="mt-3">
//                               <Select onValueChange={(value) => {
//                                 const item = menuItems.find(i => i._id === value)
//                                 if (item) updateMealItem(day, meal.key, item)
//                               }}>
//                                 <SelectTrigger>
//                                   <SelectValue placeholder="Add item to this meal..." />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                   {menuItems
//                                     .filter(item => item.isActive)
//                                     .map(item => (
//                                       <SelectItem key={item._id} value={item._id!}>
//                                         {item.name} - {item.price} ETB ({item.nutritionalInfo?.calories || 0} cal)
//                                       </SelectItem>
//                                     ))}
//                                 </SelectContent>
//                               </Select>
//                             </div>
//                           </CardContent>
//                         </Card>
//                       )
//                     })}
                    
//                     <div className="p-4 bg-green-50 rounded-lg">
//                       <p className="font-semibold">Total Daily Calories: {calculateDayCalories(weeklyMeals[day] || {})} kcal</p>
//                       <p className="text-sm text-gray-600">Target: {dailyCalories} kcal</p>
//                       <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
//                         <div 
//                           className="bg-green-600 h-2 rounded-full transition-all"
//                           style={{ width: `${Math.min(100, (calculateDayCalories(weeklyMeals[day] || {}) / dailyCalories) * 100)}%` }}
//                         />
//                       </div>
//                     </div>
//                   </TabsContent>
//                 ))}
//               </Tabs>

//               <div className="flex justify-between">
//                 <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
//                 <Button onClick={() => setStep(3)}>Review Meal Plan →</Button>
//               </div>
//             </div>
//           )}

//           {step === 3 && (
//             <div className="space-y-6">
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Meal Plan Summary for {registration.fullName}</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-2">
//                     <p><strong>Email:</strong> {registration.email}</p>
//                     <p><strong>Phone:</strong> {registration.phone}</p>
//                     <p><strong>Daily Calorie Target:</strong> {dailyCalories} kcal</p>
//                     <p><strong>BMI:</strong> {bmi} ({bmiCategory})</p>
//                     <p><strong>Start Date:</strong> {registration.startDate}</p>
//                     <p><strong>Duration:</strong> {registration.duration} week(s)</p>
//                   </div>
//                 </CardContent>
//               </Card>

//               <div className="flex justify-between">
//                 <Button variant="outline" onClick={() => setStep(2)}>Back to Edit</Button>
//                 <Button onClick={submitMealPlan} disabled={isSubmitting}>
//                   {isSubmitting ? (
//                     <>Creating Plan...</>
//                   ) : (
//                     <>Confirm & Create Meal Plan</>
//                   )}
//                 </Button>
//               </div>
//             </div>
//           )}
//         </ScrollArea>
//       </DialogContent>
//     </Dialog>
//   )
// }
