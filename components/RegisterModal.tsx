'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Phone, Mail, Lock, Key, User, MapPin } from 'lucide-react'
import { RainbowButton } from "../components/rainbow-button"
import { useToast } from "@/hooks/use-toast"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/input-otp"

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onRegister: () => void
}

export function RegisterModal({ isOpen, onClose, onRegister }: RegisterModalProps) {
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [registerMethod, setRegisterMethod] = useState<'phone' | 'email'>('phone')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address, setAddress] = useState('')
  const [phoneOrEmail, setPhoneOrEmail] = useState('')
  const [otp, setOtp] = useState('')
  const { toast } = useToast()

  const handleSendOtp = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/customer/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: phoneOrEmail }),
      })
      
      if (response.ok) {
        setIsOtpSent(true)
        toast({
          title: "OTP Sent",
          description: "Please check your email for the OTP.",
        })
      } else {
        throw new Error('Failed to send OTP')
      }
    } catch (error) {
      console.error('Error sending OTP:', error)
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRegister = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/customer/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: phoneOrEmail,
          otp,
          firstName,
          lastName,
          address,
          personalDetails: `${firstName} ${lastName}, ${address}`
        }),
      })
      
      if (response.ok) {
        onRegister()
        onClose()
        toast({
          title: "Registration Successful",
          description: "Welcome to our platform!",
        })
      } else {
        throw new Error('Invalid OTP or registration failed')
      }
    } catch (error) {
      console.error('Error registering:', error)
      toast({
        title: "Error",
        description: "Registration failed. Please try again.",
        variant: "destructive",
      })
    }
  }

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
      <DialogContent className="sm:max-w-[425px]">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div variants={contentVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="flex justify-center mb-6">
              <Image
                src="/man_logo.jpg"
                alt="Company Logo"
                width={80}
                height={80}
                className="rounded-full border-2 border-primary p-1"
              />
            </motion.div>
            <DialogHeader>
              <motion.div variants={itemVariants}>
                <DialogTitle className="text-3xl font-bold text-center">
                  Create an Account
                </DialogTitle>
              </motion.div>
              <motion.div variants={itemVariants}>
                <DialogDescription className="text-center">
                  Join our community and enjoy exclusive benefits.
                </DialogDescription>
              </motion.div>
            </DialogHeader>
            <motion.div variants={itemVariants} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Address
                </Label>
                <Input
                  id="address"
                  placeholder="123 Main St, City, Country"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </motion.div>
            <Tabs value={registerMethod} onValueChange={(value) => setRegisterMethod(value as 'phone' | 'email')} className="w-full mt-6">
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
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        placeholder="+251 996 99 29 19"
                        className="pl-10"
                        value={phoneOrEmail}
                        onChange={(e) => setPhoneOrEmail(e.target.value)}
                      />
                      <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
              <TabsContent value="email">
                <motion.div variants={itemVariants} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Address
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={phoneOrEmail}
                        onChange={(e) => setPhoneOrEmail(e.target.value)}
                      />
                      <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
            <AnimatePresence>
              {isOtpSent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2 mt-4"
                >
                  <Label htmlFor="otp" className="flex items-center">
                    <Key className="w-4 h-4 mr-2" />
                    One-Time Password
                  </Label>
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    className="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div variants={itemVariants} className="mt-6">
              <AnimatePresence mode="wait">
                {!isOtpSent ? (
                  <motion.div
                    key="send-otp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RainbowButton onClick={handleSendOtp} className="w-full">
                      <Lock className="w-4 h-4 mr-2" />
                      Send Secure OTP
                    </RainbowButton>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RainbowButton onClick={handleRegister} className="w-full">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </RainbowButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
