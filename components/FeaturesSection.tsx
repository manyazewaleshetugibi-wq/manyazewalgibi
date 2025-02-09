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
      className="py-12 bg-white sm:py-16 lg:py-20"
    >
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl xl:text-5xl font-pj">Make every step user-centric</h2>
          <p className="mt-4 text-base leading-7 text-gray-600 sm:mt-8 font-pj">Experience the best of Ethiopian cuisine and service</p>
        </div>

        <div className="grid grid-cols-1 mt-10 text-center sm:mt-16 sm:grid-cols-2 sm:gap-x-12 gap-y-12 md:grid-cols-3 md:gap-0 xl:mt-24">
          <div className="md:p-8 lg:p-14">
            <svg className="mx-auto" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M45 29V23C45 10.85 35.15 1 23 1C10.85 1 1 10.85 1 23V29" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 29H1V41C1 43.209 2.791 45 5 45H13V29Z" fill="#D4D4D8" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M45 29H33V45H41C43.209 45 45 43.209 45 41V29Z" fill="#D4D4D8" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="mt-12 text-xl font-bold text-gray-900 font-pj">Authentic Cuisine</h3>
            <p className="mt-5 text-base text-gray-600 font-pj">Experience the rich flavors of traditional Ethiopian dishes prepared by our expert chefs using authentic recipes and techniques.</p>
          </div>

          <div className="md:p-8 lg:p-14 md:border-l md:border-gray-200">
            <svg className="mx-auto" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M27 27H19V45H27V27Z" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 37H1V45H9V37Z" fill="#D4D4D8" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M45 17H37V45H45V17Z" fill="#D4D4D8" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 17L15 7L23 15L37 1" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M28 1H37V10" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="mt-12 text-xl font-bold text-gray-900 font-pj">Cultural Experience</h3>
            <p className="mt-5 text-base text-gray-600 font-pj">Immerse yourself in Ethiopian culture with our traditional decor, music, and dining customs, creating a unique and memorable experience.</p>
          </div>

          <div className="md:p-8 lg:p-14 md:border-l md:border-gray-200">
            <svg className="mx-auto" width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M41 1H1V41H41V1Z" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 7H7V20H18V7Z" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 26H7V35H18V26Z" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M35 7H24V35H35V7Z" fill="#D4D4D8" stroke="#161616" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="mt-12 text-xl font-bold text-gray-900 font-pj">Exceptional Service</h3>
            <p className="mt-5 text-base text-gray-600 font-pj">Our dedicated staff provides attentive and friendly service, ensuring your dining experience is nothing short of exceptional from start to finish.</p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
