'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, Variants } from 'framer-motion'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  UserPlus, Phone, Mail, Lock, User, MapPin, 
  Navigation, Check, Clock, MapPinHouse, Building,
  Shield, Sparkles, Calendar, Loader2, AlertCircle, VenusAndMars
} from 'lucide-react'
import { Eye, EyeOff } from 'lucide-react';
import { RainbowButton } from "@/components/rainbow-button"
import { useToast } from "@/hooks/use-toast"

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  country: string;
  loading: boolean;
  error: string | null;
}

interface RestaurantInfo {
  name: string;
  location: string;
  description: string;
}

type Gender = 'male' | 'female';

export default function RegisterPage() {
  const router = useRouter()
  
  const isOpen = true
  const onClose = () => router.push('/')

  const [registerMethod, setRegisterMethod] = useState<'phone' | 'email'>('email')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address, setAddress] = useState('')
  const [phoneOrEmail, setPhoneOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [location, setLocation] = useState<LocationData>({
    latitude: null,
    longitude: null,
    address: '',
    city: '',
    country: '',
    loading: false,
    error: null
  })
  const [isLocationGranted, setIsLocationGranted] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast()

  // Restaurant information
  const restaurantInfo: RestaurantInfo = {
    name: "manyazewaleshetuGibi Restaurant",
    location: "Bole, Addis Ababa",
    description: "Experience authentic Ethiopian cuisine with modern twists"
  }

  // Get user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false
      }))
      toast({
        title: "Location Error",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      })
      return
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // Try to get detailed address from reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          )
          
          if (response.ok) {
            const data = await response.json()
            const address = data.display_name || ''
            const city = data.address?.city || data.address?.town || data.address?.village || ''
            const country = data.address?.country || ''
            
            setLocation({
              latitude,
              longitude,
              address,
              city,
              country,
              loading: false,
              error: null
            })
            
            // Auto-fill address field with detected location
            setAddress(`${address}`)
            setIsLocationGranted(true)
            
            toast({
              title: "Location Detected",
              description: "Your location has been successfully detected",
            })
          } else {
            // Fallback to coordinates if reverse geocoding fails
            setLocation({
              latitude,
              longitude,
              address: `Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)}`,
              city: 'Unknown',
              country: 'Unknown',
              loading: false,
              error: null
            })
            setAddress(`Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)}`)
            setIsLocationGranted(true)
          }
        } catch (error) {
          // Fallback to coordinates on error
          setLocation({
            latitude,
            longitude,
            address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            city: '',
            country: '',
            loading: false,
            error: "Could not get detailed address"
          })
          setAddress(`Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          setIsLocationGranted(true)
          
          toast({
            title: "Location Detected",
            description: "Coordinates captured but address details unavailable",
          })
        }
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location"
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location services in your browser settings."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please check your device settings."
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again."
            break
        }
        
        setLocation(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }))
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Auto-detect location if permission already granted
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          getUserLocation()
        }
      })
    }
  }, [])

  const handleRegister = async () => {
    setError(null)
    setSuccess(null)

    // Validate inputs
    if (!firstName || !lastName || !phoneOrEmail || !password || !confirmPassword || !birthDate || !address) {
      setError("Please fill in all required fields")
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate email format if email method is selected
    if (registerMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(phoneOrEmail)) {
        setError("Please enter a valid email address")
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        })
        return
      }
    }

    // Validate phone format if phone method is selected
    if (registerMethod === 'phone') {
      const phoneRegex = /^[0-9]{10,15}$/
      const cleanPhone = phoneOrEmail.replace(/\D/g, '')
      if (!phoneRegex.test(cleanPhone)) {
        setError("Please enter a valid phone number (10-15 digits)")
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number (10-15 digits)",
          variant: "destructive",
        })
        return
      }
    }

    // Validate password match
    if (password !== confirmPassword) {
      setError("Please make sure your passwords match")
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      })
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return
    }

    // Validate birth date (must be at least 13 years old)
    const today = new Date()
    const birthDateObj = new Date(birthDate)
    let age = today.getFullYear() - birthDateObj.getFullYear()
    const monthDiff = today.getMonth() - birthDateObj.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--
    }
    
    if (age < 13) {
      setError("You must be at least 13 years old to register")
      toast({
        title: "Age Restriction",
        description: "You must be at least 13 years old to register",
        variant: "destructive",
      })
      return
    }

    setIsRegistering(true)

    try {
      // Prepare user data for registration
      const userData = {
        firstName,
        lastName,
        email: registerMethod === 'email' ? phoneOrEmail : null,
        phone: registerMethod === 'phone' ? phoneOrEmail.replace(/\D/g, '') : null,
        password,
        birthDate,
        gender,
        address,
        location: {
          coordinates: location.latitude && location.longitude 
            ? [location.longitude, location.latitude] // GeoJSON format: [longitude, latitude]
            : null,
          address: location.address,
          city: location.city,
          country: location.country
        },
        registrationSource: 'website',
        locationConsent: isLocationGranted
      }

      // Register user via API
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed')
      }

      if (result.success) {
        setSuccess("Registration successful! Redirecting to login...")
        
        toast({
          title: "Registration Successful! 🎉",
          description: "Welcome to our restaurant community!",
        })

        // Show success modal
        setShowSuccessModal(true)

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)

      } else {
        throw new Error(result.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Error registering:', error)
      
      // Handle specific error messages
      let errorMessage = "Registration failed. Please try again."
      
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          errorMessage = "An account with this email/phone already exists. Please login instead."
        } else if (error.message.includes('email')) {
          errorMessage = "Please enter a valid email address"
        } else if (error.message.includes('phone')) {
          errorMessage = "Please enter a valid phone number"
        } else if (error.message.includes('required')) {
          errorMessage = error.message
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const PasswordInput = ({ id, placeholder, value, onChange, required, isConfirm = false }) => {
    const [visible, setVisible] = useState(false);
    const toggleVisible = () => setVisible(!visible);
    return (
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} placeholder={placeholder} value={value} onChange={onChange} required={required} className="pr-10" />
        <Button type="button" variant="ghost" size="icon" onClick={toggleVisible} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full">{visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
      </div>
    );
  };


  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { 
        duration: 0.5, 
        type: 'spring', 
        stiffness: 300, 
        damping: 30 
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      transition: { 
        duration: 0.3 
      } 
    }
  }

  const contentVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        delay: 0.2, 
        duration: 0.5,
        staggerChildren: 0.1,
        delayChildren: 0.3
      } 
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Restaurant Banner */}
          <motion.div variants={itemVariants} className="mb-6">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{restaurantInfo.name}</h3>
                    <p className="text-sm text-muted-foreground">{restaurantInfo.location}</p>
                  </div>
                  <Badge variant="outline" className="border-primary/30">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Restaurant
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={contentVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="flex justify-center mb-6">
              <div className="relative">
                <Image
                  src="/man_logo.png"
                  alt="Restaurant Logo"
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-primary p-1"
                />
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
            <DialogHeader>
              <motion.div variants={itemVariants}>
                <DialogTitle className="text-3xl font-bold text-center">
                  Join Our Restaurant
                </DialogTitle>
              </motion.div>
              <motion.div variants={itemVariants}>
                <DialogDescription className="text-center">
                  Register to enjoy exclusive benefits, track orders, and earn rewards
                </DialogDescription>
              </motion.div>
            </DialogHeader>
            
            {/* Location Detection Section */}
            <motion.div variants={itemVariants} className="mt-4">
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPinHouse className="h-5 w-5 text-primary" />
                      <Label className="font-medium">Your Location</Label>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={getUserLocation}
                      disabled={location.loading}
                      className="h-8"
                    >
                      {location.loading ? (
                        <>
                          <Clock className="h-3 w-3 mr-2 animate-spin" />
                          Detecting...
                        </>
                      ) : (
                        <>
                          <Navigation className="h-3 w-3 mr-2" />
                          Detect Location
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {location.error ? (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {location.error}
                    </div>
                  ) : location.address ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{location.address}</p>
                          {(location.city || location.country) && (
                            <p className="text-xs text-muted-foreground">
                              {location.city && `${location.city}, `}{location.country}
                            </p>
                          )}
                          {location.latitude && location.longitude && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Click "Detect Location" to automatically fill your address
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Gender Field */}
              <div className="space-y-2">
                <Label className="flex items-center">
                  <VenusAndMars className="w-4 h-4 mr-2" />
                  Gender
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={gender === 'male' ? "default" : "outline"}
                    onClick={() => setGender('male')}
                    className="h-10"
                  >
                    Male
                  </Button>
                  <Button
                    type="button"
                    variant={gender === 'female' ? "default" : "outline"}
                    onClick={() => setGender('female')}
                    className="h-10"
                  >
                    Female
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Birth Date *
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  You must be at least 13 years old to register
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Delivery Address *
                </Label>
                <Input
                  id="address"
                  placeholder="123 Main St, City, Country"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This address will be used for delivery. Use location detection for accuracy.
                </p>
              </div>
            </motion.div>

            <Tabs 
              value={registerMethod} 
              onValueChange={(value) => setRegisterMethod(value as 'phone' | 'email')} 
              className="w-full mt-6"
            >
              <motion.div variants={itemVariants}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="phone" className="flex items-center justify-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Phone
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex items-center justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </TabsTrigger>
                </TabsList>
              </motion.div>
              
              <TabsContent value="phone">
                <motion.div variants={itemVariants} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Phone Number *
                    </Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        placeholder="+251 996 99 29 19"
                        className="pl-10"
                        value={phoneOrEmail}
                        onChange={(e) => setPhoneOrEmail(e.target.value)}
                        required
                      />
                      <Phone className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your phone number (digits only, 10-15 digits)
                    </p>
                  </div>
                </motion.div>
              </TabsContent>
              
              <TabsContent value="email">
                <motion.div variants={itemVariants} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Address *
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={phoneOrEmail}
                        onChange={(e) => setPhoneOrEmail(e.target.value)}
                        required
                      />
                      <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>

            {/* Password Fields */}
            <motion.div variants={itemVariants} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Password *
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Confirm Password *
                </Label>

                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </motion.div>

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-green-600 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2 mt-4"
              >
                <Check className="h-4 w-4" />
                {success}
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex items-center gap-2 mt-4"
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="mt-6 space-y-3">
              <RainbowButton 
                onClick={handleRegister} 
                className="w-full"
                disabled={isRegistering || !firstName || !lastName || !phoneOrEmail || !password || !confirmPassword || !birthDate || !address}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </>
                )}
              </RainbowButton>

              <p className="text-xs text-center text-muted-foreground">
                By registering, you agree to our Terms of Service and Privacy Policy
              </p>
            </motion.div>

            {/* Registration Success Modal */}
            {showSuccessModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 m-4 max-w-md w-full">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Welcome to {restaurantInfo.name}! 🎉</h3>
                    <p className="text-muted-foreground mb-4">
                      Your registration is complete! You'll be redirected to login shortly.
                    </p>
                    <Card className="border-primary/20 mb-4">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Your Role:</span>
                            <Badge variant="secondary">USER</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Name:</span>
                            <span className="text-sm font-medium">{firstName} {lastName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Gender:</span>
                            <span className="text-sm font-medium">
                              {gender === 'male' ? 'Male' : 'Female'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Location:</span>
                            <span className="text-sm font-medium">{location.city || 'Detected'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="mt-6">
                      <div className="h-1 w-full bg-primary/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 3, ease: 'linear' }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Redirecting to login...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}