'use client'

import { motion } from 'framer-motion'
import { Utensils, Music, Coffee, Heart } from 'lucide-react'

export function FeaturesSection() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      id="features" 
      className="py-12 bg-white sm:py-16 lg:py-20"
    >
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold leading-tight text-purple-900 sm:text-4xl xl:text-5xl font-pj">Make every step user-centric</h2>
          <p className="mt-4 text-base leading-7 text-gray-600 sm:mt-8 font-pj">Experience the best of Ethiopian cuisine and service</p>
        </div>

        <div className="grid grid-cols-1 mt-10 text-center sm:mt-16 sm:grid-cols-2 sm:gap-x-12 gap-y-12 md:grid-cols-3 md:gap-0 xl:mt-24">
          <div className="md:p-8 lg:p-14 group hover:bg-purple-50/50 transition-colors rounded-3xl">
            <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <Utensils className="w-10 h-10 text-purple-900" />
            </div>
            <h3 className="mt-8 text-xl font-bold text-purple-900 font-pj">Authentic Cuisine</h3>
            <p className="mt-5 text-base text-gray-600 font-pj">Experience the rich flavors of traditional Ethiopian dishes prepared by our expert chefs using authentic recipes and techniques.</p>
          </div>

          <div className="md:p-8 lg:p-14 md:border-l md:border-purple-100 group hover:bg-purple-50/50 transition-colors rounded-3xl">
            <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <Music className="w-10 h-10 text-purple-900" />
            </div>
            <h3 className="mt-8 text-xl font-bold text-purple-900 font-pj">Cultural Experience</h3>
            <p className="mt-5 text-base text-gray-600 font-pj">Immerse yourself in Ethiopian culture with our traditional decor, music, and dining customs, creating a unique and memorable experience.</p>
          </div>

          <div className="md:p-8 lg:p-14 md:border-l md:border-purple-100 group hover:bg-purple-50/50 transition-colors rounded-3xl">
            <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <Heart className="w-10 h-10 text-purple-900" />
            </div>
            <h3 className="mt-8 text-xl font-bold text-purple-900 font-pj">Exceptional Service</h3>
            <p className="mt-5 text-base text-gray-600 font-pj">Our dedicated staff provides attentive and friendly service, ensuring your dining experience is nothing short of exceptional from start to finish.</p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
