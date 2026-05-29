"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Loader2, Mail, Phone, Clock, MapPin, Send, MessageSquare, CheckCircle, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import toast, { Toaster } from "react-hot-toast"
import { NavBar } from "@/components/NavBar"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import emailjs from '@emailjs/browser';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [messageLength, setMessageLength] = useState(0)
  const [submitStatus, setSubmitStatus] = useState<{ status: 'idle' | 'success' | 'error', message?: string }>({ status: 'idle' })
  const form = useRef<HTMLFormElement>(null)
  const messageMaxLength = 500

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageLength(e.target.value.length)
  }

  const validateForm = (formData: FormData) => {
    if (!formData.fullName?.trim()) {
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          <span>Please enter your name</span>
        </div>,
        {
          style: {
            borderRadius: "10px",
            background: "#4a1d6d",
            color: "#fff",
          },
        }
      )
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          <span>Please enter a valid email address</span>
        </div>,
        {
          style: {
            borderRadius: "10px",
            background: "#4a1d6d",
            color: "#fff",
          },
        }
      )
      return false
    }
    if (!formData.message?.trim()) {
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          <span>Please enter your message</span>
        </div>,
        {
          style: {
            borderRadius: "10px",
            background: "#4a1d6d",
            color: "#fff",
          },
        }
      )
      return false
    }
    if (formData.message.length > messageMaxLength) {
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          <span>Message exceeds {messageMaxLength} characters</span>
        </div>,
        {
          style: {
            borderRadius: "10px",
            background: "#4a1d6d",
            color: "#fff",
          },
        }
      )
      return false
    }
    return true
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    const formData = new FormData(event.currentTarget)
    const data = {
      fullName: formData.get('fullName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      message: formData.get('message') as string,
    }

    if (!validateForm(data)) return

    setIsLoading(true)
    setSubmitStatus({ status: 'idle' })

    try {
      await emailjs.sendForm(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_6zc7h4c',
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_xlm8hpt',
        event.currentTarget,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'aYJfTd5zdKZbso_E4'
      )
      
      setSubmitStatus({ 
        status: 'success', 
        message: "Message sent successfully! We'll get back to you soon." 
      })
      
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" size={20} />
          <span>Message sent successfully!</span>
        </div>,
        {
          style: {
            borderRadius: "10px",
            background: "#4a1d6d",
            color: "#fff",
          },
        }
      )
      
      // Reset form - Use the ref instead of event.currentTarget
      if (form.current) {
        form.current.reset()
      }
      setMessageLength(0)
      
    } catch (error: any) {
      console.error('EmailJS error:', error)
      setSubmitStatus({ 
        status: 'error', 
        message: 'Failed to send message. Please try again or email us directly at awekeadisie@gmail.com.' 
      })
      
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          <span>Failed to send message. Please try again.</span>
        </div>,
        {
          style: {
            borderRadius: "10px",
            background: "#4a1d6d",
            color: "#fff",
          },
        }
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50/30">
      <NavBar />
      <Toaster position="top-center" />

      <main className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block p-3 bg-purple-100 rounded-full mb-4"
            >
              <MessageSquare className="w-8 h-8 text-purple-900" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent mb-4">
              Get in Touch
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Contact Form Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-2 border-purple-100 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-purple-800 to-purple-900" />
                <CardContent className="p-8">
                  <div className="space-y-2 mb-8">
                    <h2 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Send us a Message
                    </h2>
                    <p className="text-gray-600">
                      Fill out the form below and we'll get back to you shortly.
                    </p>
                  </div>

                  <form ref={form} onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-900">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        name="fullName" 
                        placeholder="Enter your full name" 
                        required 
                        className="h-12 border-2 border-purple-100 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl transition-all"
                      />
                    </div>

                    {/* Email and Phone Fields */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-900">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <Input 
                          name="email" 
                          type="email" 
                          placeholder="your@email.com" 
                          required 
                          className="h-12 border-2 border-purple-100 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-900">
                          Phone
                        </label>
                        <Input 
                          name="phone" 
                          type="tel" 
                          placeholder="+251 XXX XXX XXX" 
                          className="h-12 border-2 border-purple-100 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl transition-all"
                        />
                      </div>
                    </div>

                    {/* Message Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-900">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <Textarea 
                        name="message" 
                        placeholder="Type your message here..." 
                        required 
                        onChange={handleMessageChange}
                        maxLength={messageMaxLength}
                        className="min-h-[150px] resize-none border-2 border-purple-100 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl transition-all"
                      />
                      <div className="flex justify-end">
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          messageLength > messageMaxLength * 0.9 
                            ? 'bg-red-500/20 text-red-600' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {messageLength}/{messageMaxLength}
                        </span>
                      </div>
                    </div>

                    {/* Status Message */}
                    {submitStatus.status === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-green-500/20 border border-green-400/30 text-green-700 flex items-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        {submitStatus.message}
                      </motion.div>
                    )}
                    
                    {submitStatus.status === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-700 flex items-center gap-2"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        {submitStatus.message}
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isLoading}
                      className="w-full h-14 text-base font-bold bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Map and Contact Info Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {/* Map Card */}
              <Card className="border-2 border-purple-100 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
                <div className="h-[250px] relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent pointer-events-none z-10" />
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.5784959989087!2d38.790016376514!3d8.994092193554655!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b850987486923%3A0x43aee1be6405b0d7!2sManyazewal%20Eshetu%20Gibi%20%7C%20Bole%20%7C%20%E1%88%9B%E1%8A%95%E1%8B%AB%E1%8B%98%E1%8B%8B%E1%88%8D%20%E1%8A%A5%E1%88%B8%E1%89%B1%20%E1%8C%8D%E1%89%A2%20%7C%20%E1%89%A6%E1%88%8C!5e0!3m2!1sen!2sus!4v1682439231544!5m2!1sen!2sus"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full"
                  />
                </div>
              </Card>

              {/* Contact Info Cards */}
              <div className="grid sm:grid-cols-2 gap-6">
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-2 border-purple-100 rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-white to-purple-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                          <Mail className="h-6 w-6 text-purple-900" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-purple-900 mb-1">Email Us</h3>
                          <p className="text-gray-600 text-sm">awekeadisie@gmail.com</p>
                          <p className="text-gray-600 text-sm">support@manyazewal.com</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-2 border-purple-100 rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-white to-purple-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                          <Phone className="h-6 w-6 text-purple-900" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-purple-900 mb-1">Call Us</h3>
                          <p className="text-gray-600 text-sm">+251 98 720 9020</p>
                          <p className="text-gray-600 text-sm">+251 11 123 4567</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="sm:col-span-2"
                >
                  <Card className="border-2 border-purple-100 rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-white to-purple-50/50">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-purple-100 rounded-xl">
                            <Clock className="h-6 w-6 text-purple-900" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-purple-900 mb-1">Opening Hours</h3>
                            <p className="text-gray-600 text-sm">Mon - Fri: 9:00 AM - 9:00 PM</p>
                            <p className="text-gray-600 text-sm">Sat - Sun: 9:00 AM - 9:00 PM</p>
                          </div>
                        </div>
                        
                        <Separator orientation="vertical" className="hidden sm:block h-auto bg-purple-200" />
                        <Separator className="sm:hidden bg-purple-200" />
                        
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-purple-100 rounded-xl">
                            <MapPin className="h-6 w-6 text-purple-900" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-purple-900 mb-1">Address</h3>
                            <p className="text-gray-600 text-sm font-medium">Manyazewal Eshetu Gibi</p>
                            <p className="text-gray-600 text-sm">Back of Selam City Mall, Bole</p>
                            <p className="text-gray-600 text-sm">Addis Ababa, Ethiopia</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Additional Info Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-2 border-purple-100 rounded-xl shadow-lg bg-gradient-to-r from-purple-50 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-900 rounded-full">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">We typically respond within</p>
                        <p className="text-lg font-bold text-purple-900">24 hours</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
