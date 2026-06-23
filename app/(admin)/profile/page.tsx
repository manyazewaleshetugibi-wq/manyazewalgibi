"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast, Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  Sparkles
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
}

export default function EditProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
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
      setProfile(data.user)
      
      // Set form data
      setFormData(prev => ({
        ...prev,
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        address: data.user.address || "",
        avatar: data.user.avatar || ""
      }))
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
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
      
      // Prepare data for API
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
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
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
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
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" />
      
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and security preferences
          </p>
        </div>

        {/* Main Content - No Card Background */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Profile Summary */}
          <div className="lg:w-80">
            <div className="sticky top-8">
              <div className="flex flex-col items-center text-center p-6 border border-slate-200 rounded-xl bg-white">
                <div className="relative group">
                  <Avatar className="h-28 w-28 ring-4 ring-slate-100 shadow-sm transition-all duration-300 group-hover:scale-105">
                    {profile.avatar ? (
                      <AvatarImage src={profile.avatar} alt={profile.name} className="object-cover" />
                    ) : (
                      <AvatarFallback className="text-2xl bg-primary text-white">
                        {getInitials(profile.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label
                    htmlFor="avatar-upload-sidebar"
                    className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full shadow-md cursor-pointer hover:bg-slate-50 transition-all duration-200 border border-slate-200"
                  >
                    <Camera className="h-3.5 w-3.5 text-primary" />
                    <input
                      id="avatar-upload-sidebar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>
                
                <h2 className="mt-4 text-xl font-semibold text-slate-800">{profile.name}</h2>
                <div className="mt-1 flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground capitalize">{profile.role}</span>
                </div>
                
                <div className="mt-6 w-full space-y-3">
                  <div className="flex items-center justify-between text-sm py-2 border-t border-slate-100">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" /> Email
                    </span>
                    <span className="font-mono text-slate-700 truncate max-w-[160px]">{profile.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm py-2 border-t border-slate-100">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" /> Joined
                    </span>
                    <span className="text-slate-700">
                      {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 p-1 rounded-lg">
                <TabsTrigger value="profile" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                  <User className="h-4 w-4" />
                  Profile Information
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                  <Shield className="h-4 w-4" />
                  Security Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6 mt-0">
                <div className="border border-slate-200 rounded-xl p-6 bg-white">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <User className="h-4 w-4" /> Full Name
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          className={`${errors.name ? "border-red-500" : "border-slate-200"}`}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Mail className="h-4 w-4" /> Email Address
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter your email"
                          className={`${errors.email ? "border-red-500" : "border-slate-200"}`}
                        />
                        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Phone Number
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Enter your phone number"
                          className="border-slate-200"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4" /> Address
                        </Label>
                        <Textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Enter your address"
                          rows={3}
                          className="border-slate-200 resize-none"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={updating} 
                        className="bg-primary hover:bg-primary/90"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-6 mt-0">
                <div className="border border-slate-200 rounded-xl p-6 bg-white">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-700">
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            name="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            placeholder="Enter current password"
                            className={`pr-10 ${errors.currentPassword ? "border-red-500" : "border-slate-200"}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                        {errors.currentPassword && <p className="text-sm text-red-500">{errors.currentPassword}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            placeholder="Enter new password"
                            className={`pr-10 ${errors.newPassword ? "border-red-500" : "border-slate-200"}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                        {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}
                        <p className="text-sm text-muted-foreground">Password must be at least 6 characters long</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="Confirm new password"
                            className={`pr-10 ${errors.confirmPassword ? "border-red-500" : "border-slate-200"}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                        {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={updating} 
                        className="bg-primary hover:bg-primary/90"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating Password...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Security Tips */}
                <div className="border border-slate-200 rounded-xl p-6 bg-white">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Security Tips
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-700">Use strong passwords with mixed characters</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <p className="text-sm text-green-700">Change your password regularly</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <p className="text-sm text-amber-700">Never share your credentials with anyone</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}