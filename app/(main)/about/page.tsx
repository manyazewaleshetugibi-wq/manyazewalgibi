'use client'

import { motion } from 'framer-motion'
import { NavBar } from '@/components/NavBar'
import HeroSection from '@/components/HeroSection'
import { FeaturesSection } from '@/components/FeaturesSection'
import { AboutSection } from '@/components/AboutSection'
import { BlogSection } from '@/components/BlogSection'
import { TestimonialsSection } from '@/components/TestimonialsSection'
import { FAQSection } from '@/components/FAQSection'
import { Footer } from '@/components/Footer'
import { ImageFeatures } from '@/components/imagesGallary'

export default function RestaurantLanding() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col"
    >
      <NavBar />
      <main className="flex-1">
        <AboutSection />
        <ImageFeatures/>
      </main>
      <Footer />
    </motion.div>
  )
}
