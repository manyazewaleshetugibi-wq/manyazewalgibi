"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Mail, Phone, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import toast, { Toaster } from "react-hot-toast"
import { NavBar } from "@/components/NavBar"

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    
    // Store form reference
    const form = event.currentTarget

    try {
      const formData = new FormData(form)
      const formObject = Object.fromEntries(formData.entries())

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formObject,
          visibility: "PRIVATE",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to send message")
      }

      // Use the stored form reference
      form.reset()
      toast.success("Message sent successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to send message. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <NavBar />
      <Toaster position="top-center" />

      <main className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto bg-card shadow-lg rounded-lg overflow-hidden"
        >
          <div className="grid md:grid-cols-2">
            {/* Contact Form Section */}
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Get in Touch</h1>
                <p className="text-muted-foreground">
                  We'd love to hear from you. Fill out this form and we'll get back to you shortly.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="fullName" placeholder="Full Name" required className="h-12" />
                <Input name="email" type="email" placeholder="Email" required className="h-12" />
                <Input name="phone" type="tel" placeholder="Phone" className="h-12" />
                <Textarea name="message" placeholder="Your Message" required className="min-h-[150px] resize-none" />
               
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </form>
            </div>

            {/* Map and Contact Info Section */}
            <div className="bg-muted">
              <div className="h-[300px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.5784959989087!2d38.790016376514!3d8.994092193554655!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b850987486923%3A0x43aee1be6405b0d7!2sManyazewal%20Eshetu%20Gibi%20%7C%20Bole%20%7C%20%E1%88%9B%E1%8A%95%E1%8B%AB%E1%8B%98%E1%8B%8B%E1%88%8D%20%E1%8A%A5%E1%88%B8%E1%89%B1%20%E1%8C%8D%E1%89%A2%20%7C%20%E1%89%A6%E1%88%8C!5e0!3m2!1sen!2sus!4v1682439231544!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Mail className="mr-2 h-5 w-5" /> Contact Info
                  </h3>
                  <p className="text-muted-foreground">info@manyazewal.com</p>
                  <p className="text-muted-foreground">0987209020</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Clock className="mr-2 h-5 w-5" /> Opening Hours
                  </h3>
                  <p className="text-muted-foreground">Mon - Fri: 9:00 AM - 9:00 PM</p>
                  <p className="text-muted-foreground">Sat - Sun: 9:00 AM - 9:00 PM</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Phone className="mr-2 h-5 w-5" /> Address
                  </h3>
                  <p className="text-muted-foreground">Manyazewal Eshetu Gibi</p>
                  <p className="text-muted-foreground">Back of Selam City Mall, Bole</p>
                  <p className="text-muted-foreground">Addis Ababa, Ethiopia</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

