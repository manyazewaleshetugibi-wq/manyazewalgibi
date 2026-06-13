'use client'

import { motion } from 'framer-motion'

export function FeaturesSection() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      id="features" 
      className="py-0 sm:py-0 md:py-0 lg:py-16 bg-white"
    >
      <div className="px-3 mx-auto max-w-7xl sm:px-4 md:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xl font-bold leading-tight text-purple-900 sm:text-2xl md:text-3xl xl:text-4xl font-pj">
            Make every step user-centric
          </h2>
          <p className="mt-1 text-xs leading-6 text-gray-600 sm:mt-2 md:mt-3 font-pj">
            Experience the best of Ethiopian cuisine and service
          </p>
        </div>

        <div className="grid grid-cols-1 mt-4 text-center sm:mt-6 md:mt-8 sm:grid-cols-2 md:grid-cols-3 gap-0 sm:gap-x-4 md:gap-x-6 lg:gap-x-8">
          <div className="p-3 sm:p-4 md:p-5 lg:p-6 group hover:bg-purple-50/50 transition-colors rounded-xl sm:rounded-2xl">
            <h3 className="text-base font-bold text-purple-900 sm:text-lg md:text-xl font-pj">
              Authentic Cuisine
            </h3>
            <p className="mt-1 text-xs text-gray-600 sm:mt-2 sm:text-sm font-pj">
              Experience the rich flavors of traditional Ethiopian dishes prepared by our expert chefs using authentic recipes and techniques.
            </p>
          </div>

          <div className="p-3 sm:p-4 md:p-5 lg:p-6 group hover:bg-purple-50/50 transition-colors rounded-xl sm:rounded-2xl sm:border-l sm:border-purple-100">
            <h3 className="text-base font-bold text-purple-900 sm:text-lg md:text-xl font-pj">
              Cultural Experience
            </h3>
            <p className="mt-1 text-xs text-gray-600 sm:mt-2 sm:text-sm font-pj">
              Immerse yourself in Ethiopian culture with our traditional decor, music, and dining customs, creating a unique and memorable experience.
            </p>
          </div>

          <div className="p-3 sm:p-4 md:p-5 lg:p-6 group hover:bg-purple-50/50 transition-colors rounded-xl sm:rounded-2xl sm:border-l sm:border-purple-100">
            <h3 className="text-base font-bold text-purple-900 sm:text-lg md:text-xl font-pj">
              Exceptional Service
            </h3>
            <p className="mt-1 text-xs text-gray-600 sm:mt-2 sm:text-sm font-pj">
              Our dedicated staff provides attentive and friendly service, ensuring your dining experience is nothing short of exceptional from start to finish.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}