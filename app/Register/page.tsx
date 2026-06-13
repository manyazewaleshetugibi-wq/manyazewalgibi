'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  UserPlus, Phone, Mail, Lock, User, MapPin, 
  Check, Calendar, Loader2, AlertCircle, VenusAndMars,
  Gift, Eye, EyeOff, Crosshair,
  MapPinned, CircleCheckBig
} from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

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

// Animation variants
const formVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
}

const PasswordInput = ({ id, placeholder, value, onChange, required, error, isMobile = false }: any) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={cn(
          "pr-8 border-2 focus:border-purple-600 focus:ring-purple-600 transition-all duration-300",
          isMobile ? "h-11 text-base" : "h-9 text-sm",
          error ? "border-destructive focus:ring-destructive" : "border-purple-100 dark:border-purple-800/50"
        )}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 transition-colors"
      >
        {visible ? <EyeOff className="h-4 w-4 md:h-3.5 md:w-3.5" /> : <Eye className="h-4 w-4 md:h-3.5 md:w-3.5" />}
      </button>
    </div>
  )
}

// Form Content Component
function FormContent({
  firstName, setFirstName,
  lastName, setLastName,
  email, setEmail,
  phone, setPhone,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  birthDate, setBirthDate,
  inviterCode, setInviterCode,
  gender, setGender,
  address, setAddress,
  errors, clearFieldError,
  location, getUserLocation,
  validatingInviter, inviterValid, inviterDetails,
  error, isRegistering, handleRegister,
  isMobile = false
}: any) {
  return (
    <div className={cn("space-y-5", isMobile ? "px-2" : "")}>
      {/* Location Card - Minimized and compact */}
      <motion.div variants={itemVariants}>
        <div className={cn(
          "rounded-xl border transition-all duration-300 overflow-hidden",
          location.address && !location.error 
            ? "border-green-200 bg-green-50/40 dark:bg-green-950/5" 
            : location.error 
              ? "border-red-200 bg-red-50/40"
              : "border-purple-100 bg-purple-50/40"
        )}>
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1 rounded-lg",
                  location.address && !location.error 
                    ? "bg-green-100 text-green-600" 
                    : "bg-purple-100 text-purple-600"
                )}>
                  <MapPinned className="h-3.5 w-3.5" />
                </div>
                <div>
                  <Label className="font-semibold text-xs text-gray-700 dark:text-gray-300">
                    Delivery Location
                  </Label>
                  <p className="text-[9px] text-gray-400">We'll deliver to this address</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={getUserLocation}
                disabled={location.loading}
                size="sm"
                className={cn(
                  "h-7 px-2 text-[10px] font-medium transition-all duration-300",
                  "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm"
                )}
              >
                {location.loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ...
                  </>
                ) : (
                  <>
                    <Crosshair className="h-3 w-3 mr-1" />
                    Detect
                  </>
                )}
              </Button>
            </div>

            <AnimatePresence mode="wait">
              {location.loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex items-center gap-2 text-xs text-purple-600 bg-purple-100 rounded-md p-1.5"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px]">Getting your location...</span>
                </motion.div>
              )}

              {!location.loading && location.address && !location.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2"
                >
                  <div className="flex items-start gap-1.5 bg-white/50 rounded-md p-1.5">
                    <CircleCheckBig className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                        Location detected!
                      </p>
                      <p className="text-[9px] text-gray-500 truncate">
                        {location.address.split(',')[0]}{location.address.split(',')[1] ? `, ${location.address.split(',')[1]}` : ''}
                      </p>
                      {location.city && (
                        <p className="text-[8px] text-purple-500">
                          {location.city}, {location.country}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {!location.loading && location.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex items-center gap-1.5 text-red-600 bg-red-100 rounded-md p-1.5"
                >
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span className="text-[9px] flex-1">{location.error}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={getUserLocation}
                    className="h-5 text-[9px] px-1"
                  >
                    Retry
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Name Row */}
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-2 gap-3"
        )}>
          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <User className="h-3 w-3" /> First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Abebe"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName') }}
              className={cn(
                "border-2 focus:border-purple-600 transition-all",
                isMobile ? "h-11 text-base" : "h-9 text-sm",
                errors.firstName ? "border-red-300 focus:border-red-500" : "border-gray-200"
              )}
            />
            {errors.firstName && <p className="text-[10px] text-red-500">{errors.firstName}</p>}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Last Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Kebede"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName') }}
              className={cn(
                "border-2 transition-all",
                isMobile ? "h-11 text-base" : "h-9 text-sm",
                errors.lastName ? "border-red-300" : "border-gray-200"
              )}
            />
            {errors.lastName && <p className="text-[10px] text-red-500">{errors.lastName}</p>}
          </motion.div>
        </div>

        {/* Gender & Birth Date */}
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-2 gap-3"
        )}>
          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <VenusAndMars className="h-3 w-3" /> Gender
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={gender === 'male' ? "default" : "outline"}
                onClick={() => setGender('male')}
                className={cn(
                  "flex-1 transition-all",
                  isMobile ? "h-10 text-sm" : "h-8 text-xs",
                  gender === 'male' 
                    ? "bg-purple-600 hover:bg-purple-700" 
                    : "border-2 border-gray-200 hover:border-purple-300"
                )}
              >
                Male
              </Button>
              <Button
                type="button"
                variant={gender === 'female' ? "default" : "outline"}
                onClick={() => setGender('female')}
                className={cn(
                  "flex-1 transition-all",
                  isMobile ? "h-10 text-sm" : "h-8 text-xs",
                  gender === 'female' 
                    ? "bg-purple-600 hover:bg-purple-700" 
                    : "border-2 border-gray-200 hover:border-purple-300"
                )}
              >
                Female
              </Button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Birth Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => { setBirthDate(e.target.value); clearFieldError('birthDate') }}
              className={cn(
                "border-2 transition-all",
                isMobile ? "h-11 text-base" : "h-9 text-sm",
                errors.birthDate ? "border-red-300" : "border-gray-200"
              )}
            />
            {errors.birthDate && <p className="text-[10px] text-red-500">{errors.birthDate}</p>}
          </motion.div>
        </div>

        {/* Delivery Address */}
        <motion.div variants={itemVariants} className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Delivery Address <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="Enter your full delivery address"
            value={address}
            onChange={(e) => { setAddress(e.target.value); clearFieldError('address') }}
            className={cn(
              "border-2 transition-all",
              isMobile ? "h-11 text-base" : "h-9 text-sm",
              errors.address ? "border-red-300" : "border-gray-200"
            )}
          />
          {errors.address && <p className="text-[10px] text-red-500">{errors.address}</p>}
        </motion.div>

        {/* Email & Phone */}
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-2 gap-3"
        )}>
          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
                className={cn(
                  "pl-8 border-2 transition-all",
                  isMobile ? "h-11 text-base" : "h-9 text-sm",
                  errors.email ? "border-red-300" : "border-gray-200"
                )}
              />
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            {errors.email && <p className="text-[10px] text-red-500">{errors.email}</p>}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                placeholder="+251 912 345 678"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); clearFieldError('phone') }}
                className={cn(
                  "pl-8 border-2 transition-all",
                  isMobile ? "h-11 text-base" : "h-9 text-sm",
                  errors.phone ? "border-red-300" : "border-gray-200"
                )}
              />
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            {errors.phone && <p className="text-[10px] text-red-500">{errors.phone}</p>}
          </motion.div>
        </div>

        {/* Password & Confirm */}
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-2 gap-3"
        )}>
          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Password <span className="text-red-500">*</span>
            </Label>
            <PasswordInput
              placeholder="••••••"
              value={password}
              onChange={(e: any) => { setPassword(e.target.value); clearFieldError('password') }}
              error={errors.password}
              isMobile={isMobile}
            />
            {errors.password && <p className="text-[10px] text-red-500">{errors.password}</p>}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Confirm Password <span className="text-red-500">*</span></Label>
            <PasswordInput
              placeholder="••••••"
              value={confirmPassword}
              onChange={(e: any) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword') }}
              error={errors.confirmPassword}
              isMobile={isMobile}
            />
            {errors.confirmPassword && <p className="text-[10px] text-red-500">{errors.confirmPassword}</p>}
          </motion.div>
        </div>

        {/* Referral Code */}
        <motion.div variants={itemVariants} className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Gift className="h-3 w-3" /> Referral Code
          </Label>
          <div className="relative">
            <Input
              placeholder="Enter referral code (optional)"
              value={inviterCode}
              onChange={(e) => { setInviterCode(e.target.value.trim().toUpperCase()); clearFieldError('inviterCode') }}
              className={cn(
                "border-2 pr-8 transition-all",
                isMobile ? "h-11 text-base" : "h-9 text-sm",
                inviterValid === true ? "border-green-400 bg-green-50" : "",
                inviterValid === false ? "border-red-300" : "",
                "border-gray-200"
              )}
            />
            {validatingInviter && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-purple-600" />
            )}
            {!validatingInviter && inviterValid === true && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
            {!validatingInviter && inviterValid === false && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
            )}
          </div>
          {inviterValid === true && inviterDetails && (
            <p className="text-[10px] text-green-600 flex items-center gap-1">
              <CircleCheckBig className="h-3 w-3" /> Referred by {inviterDetails.name}
            </p>
          )}
          {errors.inviterCode && <p className="text-[10px] text-red-500">{errors.inviterCode}</p>}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-xs">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.div variants={itemVariants}>
          <Button
            onClick={handleRegister}
            className={cn(
              "w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white transition-all duration-300 hover:shadow-lg font-semibold",
              isMobile ? "h-12 text-base" : "h-10 text-sm"
            )}
            disabled={isRegistering}
          >
            {isRegistering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </>
            )}
          </Button>
        </motion.div>

        {/* Desktop Footer Links */}
        {!isMobile && (
          <motion.div variants={itemVariants} className="pt-4 space-y-3">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <a className="text-purple-600 font-semibold hover:underline hover:text-purple-700 transition-colors" href="/login">
                  Sign In
                </a>
              </p>
            </div>
            <div className="text-center">
              <a href="/" className="text-purple-500 text-sm hover:underline inline-flex items-center gap-1 transition-colors">
                ← Back to Home
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Desktop Slides Component
function DesktopSlides({ slides, restaurantInfo, currentSlide, setCurrentSlide }: any) {
  return (
    <div className="relative hidden md:block overflow-hidden bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl">
      <div className="absolute inset-0">
        <Image
          src="/stock1.jpg"
          alt="Restaurant Experience"
          fill
          className="object-cover transition-all duration-700 mix-blend-overlay opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/95 via-purple-900/70 to-purple-900/40" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <div className="relative w-full max-w-sm mx-auto">
            {/* Slide Indicators */}
            <div className="absolute -top-12 left-0 right-0 flex justify-center gap-2 z-10">
              {slides.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={cn(
                    "transition-all duration-300 rounded-full",
                    currentSlide === index
                      ? "w-6 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                  )}
                />
              ))}
            </div>

            {/* Slides */}
            <div className="relative h-[280px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center"
                >
                  <div className="space-y-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                      {slides[currentSlide].title}
                    </h2>
                    <p className="text-base text-white/90 leading-relaxed max-w-xs mx-auto">
                      {slides[currentSlide].content}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Restaurant Name Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-16 left-0 right-0 text-center"
            >
              <div className="space-y-1">
                <h3 className="text-white/80 text-sm font-medium tracking-wide">
                  {restaurantInfo.name}
                </h3>
                <p className="text-white/50 text-xs">
                  {restaurantInfo.location}
                </p>
                <div className="flex justify-center gap-1 pt-2">
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

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

  // Auto-scrolling slides content
  const slides = [
    {
      title: "Premium Member Benefits",
      content: "Join our exclusive community and unlock amazing perks tailored just for you"
    },
    {
      title: "Exclusive Discounts",
      content: "Get up to 30% off on your favorite dishes with member-only pricing"
    },
    {
      title: "Priority Delivery",
      content: "Skip the wait with priority delivery service and get your food faster"
    },
    {
      title: "Birthday Rewards",
      content: "Celebrate your special day with complimentary dishes and special surprises"
    },
    {
      title: "Early Access",
      content: "Be the first to try new menu items and seasonal specials before anyone else"
    },
    {
      title: "Points Program",
      content: "Earn points on every order and redeem them for free meals and upgrades"
    }
  ]

  const [currentSlide, setCurrentSlide] = useState(0)

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [slides.length])

  const restaurantInfo: RestaurantInfo = {
    name: "Manyazewaleshetu Gibi",
    location: "Bole, Addis Ababa",
    description: "Authentic Ethiopian cuisine",
  }

  // Validate inviter code
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
            description: `Referred by ${data.referrer.name}!`,
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

  // Get user location
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
            toast({ title: "Location Detected", description: "Address field updated", variant: "default" })
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
          toast({ title: "Location Detected", description: "Coordinates captured", variant: "default" })
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

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!firstName.trim()) newErrors.firstName = "Required"
    if (!lastName.trim()) newErrors.lastName = "Required"
    
    if (!email.trim()) {
      newErrors.email = "Required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email"
    }
    
    if (!phone.trim()) {
      newErrors.phone = "Required"
    } else {
      const cleanPhone = phone.replace(/\D/g, '')
      if (cleanPhone.length < 9 || cleanPhone.length > 15) {
        newErrors.phone = "9-15 digits"
      }
    }
    
    if (!password) {
      newErrors.password = "Required"
    } else if (password.length < 6) {
      newErrors.password = "Min 6 chars"
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Required"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "No match"
    }
    
    if (!birthDate) {
      newErrors.birthDate = "Required"
    } else {
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      if (today.getMonth() < birth.getMonth() || 
         (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--
      }
      if (age < 13) {
        newErrors.birthDate = "13+ only"
      }
    }
    
    if (!address.trim()) newErrors.address = "Required"
    
    if (inviterCode && inviterValid === false) {
      newErrors.inviterCode = "Invalid code"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = async () => {
    setError(null)
    
    if (!validateForm()) {
      toast({ title: "Missing Fields", description: "Please fix form errors", variant: "destructive" })
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')

    setIsRegistering(true)

    try {
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        password,
        birthDate,
        gender,
        address: address.trim(),
        inviterCode: inviterCode || null,
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
        description: "Account created successfully!" 
      })
      setShowSuccessModal(true)

      setTimeout(() => {
        router.push('/login')
      }, 3200)

    } catch (err: any) {
      const msg = err.message?.includes('already exists')
        ? "Email or phone already registered"
        : err.message || "Registration failed"

      setError(msg)
      toast({ title: "Registration Failed", description: msg, variant: "destructive" })
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={formVariants}
      className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20"
    >
      {/* Mobile Background Decoration */}
      <div className="md:hidden fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        {/* Desktop Layout - Clean split */}
        <div className="hidden md:grid md:grid-cols-2 gap-8">
          {/* Form Section - Desktop */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200 rounded-full shadow-lg"
              >
                <Image
                  src="/man_logo.jpg"
                  alt="Logo"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              </motion.div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                Create Account
              </h1>
              <p className="text-sm text-gray-500 mt-1">Join our restaurant family & enjoy exclusive benefits</p>
            </div>
            <ScrollArea className="h-full pr-2 md:pr-4 max-h-[75vh]">
              <FormContent
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                inviterCode={inviterCode}
                setInviterCode={setInviterCode}
                gender={gender}
                setGender={setGender}
                address={address}
                setAddress={setAddress}
                errors={errors}
                clearFieldError={clearFieldError}
                location={location}
                getUserLocation={getUserLocation}
                validatingInviter={validatingInviter}
                inviterValid={inviterValid}
                inviterDetails={inviterDetails}
                error={error}
                isRegistering={isRegistering}
                handleRegister={handleRegister}
              />
            </ScrollArea>
          </motion.div>

          {/* Right Side - Desktop Slides */}
          <DesktopSlides slides={slides} restaurantInfo={restaurantInfo} currentSlide={currentSlide} setCurrentSlide={setCurrentSlide} />
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Mobile Header */}
            <motion.div variants={itemVariants} className="flex flex-col items-center text-center space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200 rounded-full shadow-lg"
              >
                <Image
                  src="/man_logo.jpg"
                  alt="Logo"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                  Create Account
                </h1>
                <p className="text-sm text-gray-500 mt-1">Join our restaurant family & enjoy exclusive benefits</p>
              </div>
            </motion.div>

            {/* Mobile Form Content */}
            <div className="space-y-5">
              <FormContent
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                inviterCode={inviterCode}
                setInviterCode={setInviterCode}
                gender={gender}
                setGender={setGender}
                address={address}
                setAddress={setAddress}
                errors={errors}
                clearFieldError={clearFieldError}
                location={location}
                getUserLocation={getUserLocation}
                validatingInviter={validatingInviter}
                inviterValid={inviterValid}
                inviterDetails={inviterDetails}
                error={error}
                isRegistering={isRegistering}
                handleRegister={handleRegister}
                isMobile
              />
            </div>

            {/* Mobile Footer Links */}
            <div className="text-center pt-4 pb-8 space-y-2">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <a className="text-purple-600 font-semibold hover:underline" href="/login">
                  Sign In
                </a>
              </p>
              <a href="/" className="text-purple-500 text-sm hover:underline inline-block">
                ← Back to Home
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <Check className="h-8 w-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">Welcome aboard! 🎉</h2>
              <p className="text-sm text-gray-500 mb-4">
                Your account has been created successfully
              </p>

              <div className="bg-purple-50 rounded-xl p-3 mb-4 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium text-gray-700">{firstName} {lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-medium text-gray-700">{phone}</span>
                </div>
                {inviterCode && inviterValid && inviterDetails && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Referred by:</span>
                    <span className="font-medium text-purple-600">{inviterDetails.name}</span>
                  </div>
                )}
              </div>

              <div className="h-1 bg-purple-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Redirecting to login...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </motion.div>
  )
}