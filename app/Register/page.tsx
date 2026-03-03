'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, Variants } from 'framer-motion'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  UserPlus, Phone, Mail, Lock, User, MapPin, 
  Navigation, Check, Clock, MapPinHouse, Building,
  Shield, Sparkles, Calendar, Loader2, AlertCircle, VenusAndMars,
  Gift
} from 'lucide-react'
import { Eye, EyeOff } from 'lucide-react'
import { RainbowButton } from "@/components/rainbow-button"
import { useToast } from "@/hooks/use-toast"

interface LocationData {
  latitude: number | null
  longitude: number | null
  address: string
  city: string
  country: string
  loading: boolean
  error: string | null
}

interface RestaurantInfo {
  name: string
  location: string
  description: string
}

type Gender = 'male' | 'female'

const PasswordInput = ({ id, placeholder, value, onChange, required }: any) => {
  const [visible, setVisible] = useState(false)
  const toggleVisible = () => setVisible(!visible)

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="pr-10"
        autoComplete="new-password"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleVisible}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </Button>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()

  const isOpen = true
  const onClose = () => router.push('/')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [inviterCode, setInviterCode] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [address, setAddress] = useState('')

  const [location, setLocation] = useState<LocationData>({
    latitude: null,
    longitude: null,
    address: '',
    city: '',
    country: '',
    loading: false,
    error: null,
  })

  const [isLocationGranted, setIsLocationGranted] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validatingInviter, setValidatingInviter] = useState(false)
  const [inviterValid, setInviterValid] = useState<boolean | null>(null)
  const [inviterDetails, setInviterDetails] = useState<{ name: string, code: string } | null>(null)

  const restaurantInfo: RestaurantInfo = {
    name: "manyazewaleshetuGibi Restaurant",
    location: "Bole, Addis Ababa",
    description: "Experience authentic Ethiopian cuisine with modern twists",
  }

  // ────────────────────────────────────────────────
  // Validate inviter code when user types
  // ────────────────────────────────────────────────
  useEffect(() => {
    const validateInviterCode = async () => {
      if (!inviterCode || inviterCode.length < 4) {
        setInviterValid(null)
        setInviterDetails(null)
        return
      }

      setValidatingInviter(true)
      try {
        const response = await fetch(`/api/user/validate-inviter?code=${encodeURIComponent(inviterCode)}`)
        const data = await response.json()
        
        if (response.ok && data.valid) {
          setInviterValid(true)
          setInviterDetails(data.referrer)
          toast({
            title: "Valid Referral Code",
            description: `You've been referred by ${data.referrer.name}!`,
          })
        } else {
          setInviterValid(false)
          setInviterDetails(null)
        }
      } catch (error) {
        console.error('Error validating inviter code:', error)
        setInviterValid(null)
        setInviterDetails(null)
      } finally {
        setValidatingInviter(false)
      }
    }

    const debounceTimer = setTimeout(validateInviterCode, 500)
    return () => clearTimeout(debounceTimer)
  }, [inviterCode, toast])

  // ────────────────────────────────────────────────
  // Location handling
  // ────────────────────────────────────────────────
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: "Geolocation not supported", loading: false }))
      toast({ title: "Location Error", description: "Browser doesn't support location.", variant: "destructive" })
      return
    }

    setLocation(prev => ({ ...prev, loading: true, error: null, address: '', city: '', country: '' }))

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          )
          if (res.ok) {
            const data = await res.json()
            const addr = data.display_name || ''
            const city = data.address?.city || data.address?.town || data.address?.village || ''
            const country = data.address?.country || ''

            setLocation({ latitude, longitude, address: addr, city, country, loading: false, error: null })
            setAddress(addr)
            setIsLocationGranted(true)
            toast({ title: "Location Detected", description: "Your location was found and address field updated" })
          } else {
            throw new Error("Reverse geocoding failed")
          }
        } catch {
          const fallbackAddress = `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`
          setLocation({
            latitude,
            longitude,
            address: fallbackAddress,
            city: 'Unknown',
            country: 'Unknown',
            loading: false,
            error: null,
          })
          setAddress(fallbackAddress)
          setIsLocationGranted(true)
          toast({ title: "Location Detected", description: "Coordinates captured (address unavailable)" })
        }
      },
      (err) => {
        let msg = "Could not get location"
        if (err.code === 1) msg = "Location permission denied"
        if (err.code === 2) msg = "Location unavailable"
        if (err.code === 3) msg = "Location request timed out"

        setLocation(prev => ({ ...prev, loading: false, error: msg }))
        toast({ title: "Location Error", description: msg, variant: "destructive" })
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    getUserLocation()
  }, [])

  const handleRegister = async () => {
    setError(null)

    // Required fields check
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !birthDate || !address) {
      setError("Please fill in all required fields")
      toast({ title: "Missing Fields", description: "All marked fields are required", variant: "destructive" })
      return
    }

    // Basic format checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      toast({ title: "Invalid Email", description: "Check your email format", variant: "destructive" })
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      setError("Phone number should be 9–15 digits")
      toast({ title: "Invalid Phone", description: "Use 9–15 digits", variant: "destructive" })
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      toast({ title: "Password Mismatch", description: "Please check both password fields", variant: "destructive" })
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      toast({ title: "Weak Password", description: "Minimum 6 characters required", variant: "destructive" })
      return
    }

    // Age check ≥ 13
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    if (today.getMonth() < birth.getMonth() || 
       (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      age--
    }
    if (age < 13) {
      setError("You must be at least 13 years old")
      toast({ title: "Age Restriction", description: "Minimum age is 13", variant: "destructive" })
      return
    }

    // Validate inviter code if provided
    if (inviterCode && inviterValid === false) {
      setError("Invalid referral code")
      toast({ title: "Invalid Referral", description: "The referral code you entered is not valid", variant: "destructive" })
      return
    }

    setIsRegistering(true)

    try {
      const userData = {
        firstName,
        lastName,
        email,
        phone: cleanPhone,
        password,
        birthDate,
        gender,
        address,
        inviterCode: inviterCode || null, // Send as inviterCode
        location: location.latitude && location.longitude
          ? { type: "Point", coordinates: [location.longitude, location.latitude] }
          : null,
        locationDetails: {
          address: location.address,
          city: location.city,
          country: location.country,
        },
        locationConsent: isLocationGranted,
        registrationSource: 'website',
      }

      const res = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.message || 'Registration failed')
      }

      toast({ 
        title: "Success! 🎉", 
        description: inviterCode 
          ? "Account created! You've been linked to your referrer." 
          : "Account created — welcome!" 
      })
      setShowSuccessModal(true)

      setTimeout(() => {
        router.push('/login')
      }, 3200)

    } catch (err: any) {
      const msg = err.message?.includes('already exists')
        ? "This email or phone is already registered. Try logging in."
        : err.message || "Registration failed. Please try again."

      setError(msg)
      toast({ title: "Registration Failed", description: msg, variant: "destructive" })
    } finally {
      setIsRegistering(false)
    }
  }

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, type: 'spring', stiffness: 320, damping: 28 } },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="
          sm:max-w-[620px] lg:max-w-[720px] 
          max-h-[96vh] overflow-y-auto 
          p-6 sm:p-8
        "
      >
        <motion.div variants={modalVariants} initial="hidden" animate="visible">
          {/* Restaurant banner */}
          <motion.div variants={itemVariants} className="mb-6">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <Building className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{restaurantInfo.name}</h3>
                    <p className="text-sm text-muted-foreground">{restaurantInfo.location}</p>
                  </div>
                  <Badge variant="outline" className="border-primary/40 px-3 py-1">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Restaurant
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="flex justify-center mb-7">
            <div className="relative">
              <Image
                src="/man_logo.png"
                alt="Restaurant Logo"
                width={90}
                height={90}
                className="rounded-full border-4 border-primary/30 p-1.5 shadow-md"
              />
              <div className="absolute -bottom-3 -right-3 bg-primary text-white rounded-full p-2 shadow">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </motion.div>

          <DialogHeader className="text-center mb-8">
            <DialogTitle className="text-3xl sm:text-4xl font-bold">Join Our Restaurant</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Create your account to order faster, track deliveries & collect rewards
            </DialogDescription>
          </DialogHeader>

          {/* Location block */}
          <motion.div variants={itemVariants} className="mb-8">
            <Card className="border-primary/20 bg-card/60">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MapPinHouse className="h-6 w-6 text-primary" />
                    <Label className="font-semibold text-base">Your Location</Label>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getUserLocation}
                    disabled={location.loading}
                    className="min-w-[160px]"
                  >
                    {location.loading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <Navigation className="h-4 w-4 mr-2" />
                        Detect Location
                      </>
                    )}
                  </Button>
                </div>

                {location.error && (
                  <div className="mt-3 text-sm text-destructive bg-destructive/10 p-3 rounded border border-destructive/20">
                    {location.error}
                  </div>
                )}

                {location.address && !location.error && (
                  <div className="mt-4 space-y-1 text-sm">
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{location.address}</p>
                        <p className="text-muted-foreground">
                          {location.city && `${location.city}, `}{location.country}
                        </p>
                        {location.latitude && location.longitude && (
                          <p className="text-xs text-muted-foreground/80 mt-1">
                            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Form fields */}
          <motion.div variants={itemVariants} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="w-4 h-4" /> First Name *
                </Label>
                <Input
                  id="firstName"
                  placeholder="Abebe"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Last Name *
                </Label>
                <Input
                  id="lastName"
                  placeholder="Kebede"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <VenusAndMars className="w-4 h-4" /> Gender
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={gender === 'male' ? "default" : "outline"}
                  onClick={() => setGender('male')}
                >
                  Male
                </Button>
                <Button
                  type="button"
                  variant={gender === 'female' ? "default" : "outline"}
                  onClick={() => setGender('female')}
                >
                  Female
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Birth Date *
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              <p className="text-xs text-muted-foreground">Must be at least 13 years old</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Delivery Address *
              </Label>
              <Input
                id="address"
                placeholder="Bole Road, behind Edna Mall, Addis Ababa"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used for delivery — use location detection for best accuracy
              </p>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email Address *
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={e => setEmail(e.target.value.trim())}
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone Number *
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    placeholder="+251 912 345 678"
                    className="pl-10"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">9–15 digits</p>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Password *
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Confirm Password *
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e: any) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Inviter Code (Referral) - Now with validation */}
            <div className="space-y-2">
              <Label htmlFor="inviterCode" className="flex items-center gap-2">
                <Gift className="w-4 h-4" /> Inviter Code (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="inviterCode"
                  placeholder="e.g. REF-ABCD1234"
                  value={inviterCode}
                  onChange={e => setInviterCode(e.target.value.trim().toUpperCase())}
                  className={`
                    ${inviterValid === true ? 'border-green-500 pr-10' : ''}
                    ${inviterValid === false ? 'border-red-500 pr-10' : ''}
                  `}
                />
                {validatingInviter && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!validatingInviter && inviterValid === true && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {!validatingInviter && inviterValid === false && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              {inviterValid === false && (
                <p className="text-xs text-red-500 mt-1">Invalid referral code</p>
              )}
              {inviterValid === true && inviterDetails && (
                <p className="text-xs text-green-500 mt-1">
                  Valid referral code from {inviterDetails.name} ✓
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter a referral code from a friend to get bonus points
              </p>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/25 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="pt-4">
              <RainbowButton
                onClick={handleRegister}
                className="w-full py-6 text-lg font-medium"
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-3 h-5 w-5" />
                    Create My Account
                  </>
                )}
              </RainbowButton>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By signing up you agree to our Terms of Service & Privacy Policy
              </p>
            </div>
          </motion.div>

          {/* Success overlay */}
          {showSuccessModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Welcome aboard! 🎉</h2>
                <p className="text-muted-foreground mb-6">
                  Your account has been created successfully.
                </p>

                <Card className="mb-8 border-primary/20">
                  <CardContent className="p-6 space-y-3 text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{firstName} {lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{location.city || 'Detected'}</span>
                    </div>
                    {inviterCode && inviterValid && inviterDetails && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Referred by:</span>
                        <span className="font-medium">{inviterDetails.name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 3, ease: 'linear' }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}