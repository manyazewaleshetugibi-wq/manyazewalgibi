"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast, Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Loader2,
  Save,
  Lock,
  Shield,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Calendar,
  BadgeCheck,
  Building,
  Globe,
  Twitter,
  Linkedin,
  Github
} from "lucide-react"

type UserProfile = {
  _id: string
  name: string
  email: string
  phone?: string
  address?: string
  avatar?: string
  role: string
  createdAt: string
  updatedAt: string
  // Additional fields that might exist in your user model
  bio?: string
  company?: string
  position?: string
  website?: string
  twitter?: string
  linkedin?: string
  github?: string
  dateOfBirth?: string
  gender?: string
  country?: string
  city?: string
  postalCode?: string
  department?: string
  employeeId?: string
  timezone?: string
  language?: string
  notificationPreferences?: {
    email: boolean
    sms: boolean
    push: boolean
  }
}

export default function EditProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    
    // Professional Info
    company: "",
    position: "",
    department: "",
    employeeId: "",
    
    // Personal Info
    dateOfBirth: "",
    gender: "",
    
    // Location Info
    country: "",
    city: "",
    postalCode: "",
    
    // Social Links
    website: "",
    twitter: "",
    linkedin: "",
    github: "",
    
    // Preferences
    timezone: "",
    language: "",
    notificationEmail: true,
    notificationSMS: false,
    notificationPush: true,
    
    // Security
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    avatar: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState("profile")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Fetch user profile
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/profile")
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch profile")
      }
      
      const data = await response.json()
      console.log("Fetched profile data:", data.user) // Debug log
      
      setProfile(data.user)
      
      // Set form data with all available fields
      setFormData(prev => ({
        ...prev,
        // Basic Info
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        address: data.user.address || "",
        bio: data.user.bio || "",
        
        // Professional Info
        company: data.user.company || "",
        position: data.user.position || "",
        department: data.user.department || "",
        employeeId: data.user.employeeId || "",
        
        // Personal Info
        dateOfBirth: data.user.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : "",
        gender: data.user.gender || "",
        
        // Location Info
        country: data.user.country || "",
        city: data.user.city || "",
        postalCode: data.user.postalCode || "",
        
        // Social Links
        website: data.user.website || "",
        twitter: data.user.twitter || "",
        linkedin: data.user.linkedin || "",
        github: data.user.github || "",
        
        // Preferences
        timezone: data.user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: data.user.language || "en",
        notificationEmail: data.user.notificationPreferences?.email ?? true,
        notificationSMS: data.user.notificationPreferences?.sms ?? false,
        notificationPush: data.user.notificationPreferences?.push ?? true,
        
        // Avatar
        avatar: data.user.avatar || ""
      }))
      
      setDataLoaded(true)
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Basic validation
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    
    // Phone validation (if provided)
    if (formData.phone && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number"
    }
    
    // Website validation (if provided)
    if (formData.website && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(formData.website)) {
      newErrors.website = "Please enter a valid URL"
    }
    
    // Password validation if changing password
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) newErrors.currentPassword = "Current password is required"
      if (!formData.newPassword) newErrors.newPassword = "New password is required"
      if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your new password"
      
      if (formData.newPassword && formData.newPassword.length < 6) {
        newErrors.newPassword = "Password must be at least 6 characters"
      }
      
      if (formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match"
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }
    
    try {
      setUpdating(true)
      
      // Prepare data for API - include all fields
      const updateData: any = {
        // Basic Info
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        bio: formData.bio || undefined,
        
        // Professional Info
        company: formData.company || undefined,
        position: formData.position || undefined,
        department: formData.department || undefined,
        employeeId: formData.employeeId || undefined,
        
        // Personal Info
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        
        // Location Info
        country: formData.country || undefined,
        city: formData.city || undefined,
        postalCode: formData.postalCode || undefined,
        
        // Social Links
        website: formData.website || undefined,
        twitter: formData.twitter || undefined,
        linkedin: formData.linkedin || undefined,
        github: formData.github || undefined,
        
        // Preferences
        timezone: formData.timezone || undefined,
        language: formData.language || undefined,
        notificationPreferences: {
          email: formData.notificationEmail,
          sms: formData.notificationSMS,
          push: formData.notificationPush
        },
        
        // Avatar
        avatar: formData.avatar || undefined
      }
      
      // Include password data only if provided
      if (formData.currentPassword && formData.newPassword && formData.confirmPassword) {
        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
        updateData.confirmPassword = formData.confirmPassword
      }
      
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile")
      }
      
      toast.success(data.message || "Profile updated successfully")
      
      // Update session with new data
      if (session) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            name: formData.name,
            email: formData.email,
            image: formData.avatar
          }
        })
      }
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }))
      
      // Refresh profile data
      fetchProfile()
      
      // Show success message for password change
      if (data.passwordChanged) {
        toast.success("Password changed successfully. Please login again with your new password.")
      }
      
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    } finally {
      setUpdating(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB")
      return
    }
    
    try {
      // Convert to base64 for preview
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        try {
          // Update avatar in database
          const response = await fetch("/api/profile", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              field: "avatar",
              value: base64String
            }),
          })
          
          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.error || "Failed to update avatar")
          }
          
          // Update local state
          setFormData(prev => ({ ...prev, avatar: base64String }))
          if (profile) {
            setProfile(prev => prev ? { ...prev, avatar: base64String } : null)
          }
          
          // Update session
          if (session) {
            await updateSession({
              ...session,
              user: {
                ...session.user,
                image: base64String
              }
            })
          }
          
          toast.success("Profile picture updated successfully")
        } catch (error) {
          console.error("Error uploading avatar:", error)
          toast.error(error instanceof Error ? error.message : "Failed to update profile picture")
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error processing image:", error)
      toast.error("Failed to process image")
    }
  }

  const getInitials = (name: string) => {
    return (name || "User")
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 max-w-4xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-12 w-full max-w-md" />
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Not Found</AlertTitle>
          <AlertDescription>
            Unable to load your profile. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Toaster />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <p className="text-muted-foreground mt-2">
          Update your personal information and account settings
        </p>
        {dataLoaded && (
          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Profile data loaded successfully
          </p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="professional" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Professional
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your personal information and how it appears to others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                    {profile.avatar ? (
                      <AvatarImage src={profile.avatar} alt={profile.name} />
                    ) : (
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {getInitials(profile.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the camera icon to upload a new profile picture
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      className={errors.phone ? "border-destructive" : ""}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell us a little about yourself"
                      rows={3}
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Professional Information
              </CardTitle>
              <CardDescription>
                Update your work and professional details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company */}
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Enter your company name"
                    />
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      placeholder="Enter your job title"
                    />
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="Enter your department"
                    />
                  </div>

                  {/* Employee ID */}
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      placeholder="Enter your employee ID"
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Links
              </CardTitle>
              <CardDescription>
                Add your social media profiles and website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Website */}
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://yourwebsite.com"
                      className={errors.website ? "border-destructive" : ""}
                    />
                    {errors.website && (
                      <p className="text-sm text-destructive">{errors.website}</p>
                    )}
                  </div>

                  {/* Twitter */}
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </Label>
                    <Input
                      id="twitter"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleInputChange}
                      placeholder="@username"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleInputChange}
                      placeholder="LinkedIn profile URL"
                    />
                  </div>

                  {/* GitHub */}
                  <div className="space-y-2">
                    <Label htmlFor="github" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub
                    </Label>
                    <Input
                      id="github"
                      name="github"
                      value={formData.github}
                      onChange={handleInputChange}
                      placeholder="GitHub username"
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal and location details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="Enter your country"
                    />
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter your city"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your address"
                      rows={3}
                    />
                  </div>

                  {/* Postal Code */}
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="Enter postal code"
                    />
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Shanghai">Shanghai</option>
                      <option value="Australia/Sydney">Sydney</option>
                    </select>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="ru">Russian</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notificationEmail"
                      name="notificationEmail"
                      checked={formData.notificationEmail}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="notificationEmail">Email notifications</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notificationSMS"
                      name="notificationSMS"
                      checked={formData.notificationSMS}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="notificationSMS">SMS notifications</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notificationPush"
                      name="notificationPush"
                      checked={formData.notificationPush}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="notificationPush">Push notifications</Label>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password *</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder="Enter your current password"
                        className={`pr-10 ${errors.currentPassword ? "border-destructive" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-sm text-destructive">{errors.currentPassword}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password *</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="Enter your new password"
                        className={`pr-10 ${errors.newPassword ? "border-destructive" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-destructive">{errors.newPassword}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your new password"
                        className={`pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and membership information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="text-lg font-semibold capitalize">{profile.role}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                    <p className="text-lg font-semibold">
                      {new Date(profile.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p className="text-lg font-semibold">
                      {new Date(profile.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email Verified</p>
                    <p className="text-lg font-semibold text-green-600">Yes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Strong Passwords</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Use a combination of letters, numbers, and special characters for a stronger password.
                </AlertDescription>
              </Alert>
              
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Regular Updates</AlertTitle>
                <AlertDescription className="text-green-700">
                  Change your password regularly to maintain account security.
                </AlertDescription>
              </Alert>
              
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Never Share Credentials</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Never share your password with anyone, including support staff.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button - Fixed at bottom for all tabs */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button 
          onClick={handleSubmit} 
          disabled={updating} 
          size="lg"
          className="shadow-lg"
        >
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}