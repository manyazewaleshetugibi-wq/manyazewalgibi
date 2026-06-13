'use client'

import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'

// TikTok Icon Component (since it's not in lucide-react)
const TikTokIcon = ({ className = "w-5 h-5" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
  </svg>
)

// Social media links configuration
const socialLinks = [
  { 
    href: "https://www.facebook.com/share/1KKkkU45nA/", 
    icon: Facebook, 
    label: "Facebook",
    color: "hover:text-blue-600"
  },
  { 
    href: "https://instagram.com/manyazewal", 
    icon: Instagram, 
    label: "Instagram",
    color: "hover:text-pink-600"
  },
  { 
    href: "https://www.tiktok.com/@manyazewalgibi", 
    icon: TikTokIcon, 
    label: "TikTok",
    color: "hover:text-black"
  },
]

export function Footer() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="py-10 bg-gradient-to-b from-white to-purple-50/50 sm:pt-16 lg:pt-24"
    >
      <div className="px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-2 md:col-span-3 lg:grid-cols-6 gap-y-16 gap-x-12">
          {/* Logo and Description Section */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:pr-8">
            <div className="relative w-32 h-12">
              <Image 
                src="/man_logo.jpg" 
                alt="Manyazewal Logo" 
                fill
                className="object-contain"
              />
            </div>

            <p className="text-base leading-relaxed text-gray-600 mt-7">
              Experience authentic Ethiopian cuisine in a modern setting. Our dishes are prepared with love and tradition, bringing the flavors of Ethiopia to your table.
            </p>

            {/* Social Media Icons */}
            <ul className="flex items-center space-x-3 mt-9">
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <a 
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.label}
                    className={`flex items-center justify-center text-white transition-all duration-200 bg-purple-900 rounded-full w-10 h-10 hover:bg-purple-800 focus:bg-purple-800 hover:scale-110 transform ${social.color}`}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <p className="text-sm font-semibold tracking-widest text-purple-900 uppercase">Company</p>
            <ul className="mt-6 space-y-4">
              <li>
                <a 
                  href="#" 
                  className="flex text-base text-gray-600 transition-all duration-200 hover:text-purple-900 hover:translate-x-1 focus:text-purple-900"
                >
                  About
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="flex text-base text-gray-600 transition-all duration-200 hover:text-purple-900 hover:translate-x-1 focus:text-purple-900"
                >
                  Features
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="flex text-base text-gray-600 transition-all duration-200 hover:text-purple-900 hover:translate-x-1 focus:text-purple-900"
                >
                  Works
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="flex text-base text-gray-600 transition-all duration-200 hover:text-purple-900 hover:translate-x-1 focus:text-purple-900"
                >
                  Career
                </a>
              </li>
            </ul>
          </div>

          {/* Help Links */}
          <div>
            <p className="text-sm font-semibold tracking-widest text-purple-900 uppercase">Help</p>
            <ul className="mt-6 space-y-4">
              <li>
                <a 
                  href="#" 
                  className="flex text-base text-gray-600 transition-all duration-200 hover:text-purple-900 hover:translate-x-1 focus:text-purple-900"
                >
                  Customer Support
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="flex text-base text-gray-600 transition-all duration-200 hover:text-purple-900 hover:translate-x-1 focus:text-purple-900"
                >
                  Delivery Details
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="flex text-base text-gray-600 transition-all duration-200 hover:text-purple-900 hover:translate-x-1 focus:text-purple-900"
                >
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="flex text-base text-gray-600 transition-all duration-200 hover:text-purple-900 hover:translate-x-1 focus:text-purple-900"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter and Contact Section */}
          <div className="col-span-2 md:col-span-1 lg:col-span-2 lg:pl-8">
            <p className="text-sm font-semibold tracking-widest text-purple-900 uppercase">
              Subscribe to newsletter
            </p>

            <form action="#" method="POST" className="mt-6">
              <div className="relative group">
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Enter your email"
                  className="block w-full p-4 text-gray-900 placeholder-gray-500 transition-all duration-200 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-900 focus:ring-2 focus:ring-purple-200 hover:border-purple-300"
                />
              </div>

              <Button 
                type="submit" 
                className="inline-flex items-center justify-center px-6 py-4 mt-3 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-purple-800 to-purple-900 rounded-xl hover:from-purple-900 hover:to-purple-950 w-full hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Subscribe
              </Button>
            </form>

            {/* Contact Information */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-gray-600 group hover:text-purple-900 transition-colors">
                <MapPin className="w-4 h-4 text-purple-900 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Bole, Addis Ababa, Ethiopia</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 group hover:text-purple-900 transition-colors">
                <Phone className="w-4 h-4 text-purple-900 group-hover:scale-110 transition-transform" />
                <span className="text-sm">+251 11 123 4567</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 group hover:text-purple-900 transition-colors">
                <Mail className="w-4 h-4 text-purple-900 group-hover:scale-110 transition-transform" />
                <span className="text-sm">info@manyazewal.com</span>
              </div>
            </div>
          </div>
        </div>

        <hr className="mt-16 mb-10 border-purple-200" />

        {/* Copyright */}
        <p className="text-sm text-center text-gray-600">
          © Copyright {new Date().getFullYear()}, All Rights Reserved by Manyazewal Restaurant
        </p>
      </div>
    </motion.section>
  )
}