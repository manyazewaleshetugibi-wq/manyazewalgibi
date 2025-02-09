'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Star } from 'lucide-react'

export function TestimonialsSection() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      id="reviews" 
      className="py-12 bg-gray-50 sm:py-16 lg:py-20"
    >
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600 font-pj">170 people have said how good Manyazewal Eshetu's restaurant is</p>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl xl:text-5xl font-pj">Our happy clients say about us</h2>
          </div>

         

          <div className="relative mt-10 md:mt-24 md:order-2">
            <div className="absolute -inset-x-1 inset-y-16 md:-inset-x-2 md:-inset-y-6">
              <div className="w-full h-full max-w-5xl mx-auto rounded-3xl opacity-30 blur-lg filter" style={{ background: 'linear-gradient(90deg, #44ff9a -0.55%, #44b0ff 22.86%, #8b44ff 48.36%, #ff6644 73.33%, #ebff70 99.34%)' }}></div>
            </div>

            <div className="relative grid max-w-lg grid-cols-1 gap-6 mx-auto md:max-w-none lg:gap-10 md:grid-cols-3">
              <div className="flex flex-col overflow-hidden shadow-xl">
                <div className="flex flex-col justify-between flex-1 p-6 bg-white lg:py-8 lg:px-7">
                  <div className="flex-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-[#FDB241]" />
                      ))}
                    </div>

                    <blockquote className="flex-1 mt-8">
                      <p className="text-lg leading-relaxed text-gray-900 font-pj">"The flavors at Manyazewal Eshetu's restaurant are a masterpiece of Ethiopian culture. The injera and doro wat are unmatched."</p>
                    </blockquote>
                  </div>

                  <div className="flex items-center mt-8">
                    <Image
                      className="flex-shrink-0 object-cover rounded-full w-11 h-11"
                      src="/man_logo.png"
                      alt="Mahlet"
                      width={44}
                      height={44}
                    />
                    <div className="ml-4">
                      <p className="text-base font-bold text-gray-900 font-pj">Mahlet Asfaw</p>
                      <p className="mt-0.5 text-sm font-pj text-gray-600">Food Critic</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col overflow-hidden shadow-xl">
                <div className="flex flex-col justify-between flex-1 p-6 bg-white lg:py-8 lg:px-7">
                  <div className="flex-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-[#FDB241]" />
                      ))}
                    </div>

                    <blockquote className="flex-1 mt-8">
                      <p className="text-lg leading-relaxed text-gray-900 font-pj">"Dining here feels like a journey through Ethiopia. The coffee ceremony and live music are magical."</p>
                    </blockquote>
                  </div>

                  <div className="flex items-center mt-8">
                    <Image
                      className="flex-shrink-0 object-cover rounded-full w-11 h-11"
                      src="/man_logo.png"
                      alt="Yonas"
                      width={44}
                      height={44}
                    />
                    <div className="ml-4">
                      <p className="text-base font-bold text-gray-900 font-pj">Yonas Tadesse</p>
                      <p className="mt-0.5 text-sm font-pj text-gray-600">Cultural Enthusiast</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col overflow-hidden shadow-xl">
                <div className="flex flex-col justify-between flex-1 p-6 bg-white lg:py-8 lg:px-7">
                  <div className="flex-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-[#FDB241]" />
                      ))}
                    </div>

                    <blockquote className="flex-1 mt-8">
                      <p className="text-lg leading-relaxed text-gray-900 font-pj">"As a vegetarian, I loved the shiro and beyainatu. Authentic and fulfilling dishes."</p>
                    </blockquote>
                  </div>

                  <div className="flex items-center mt-8">
                    <Image
                      className="flex-shrink-0 object-cover rounded-full w-11 h-11"
                      src="/man_logo.png"
                      alt="Senait"
                      width={44}
                      height={44}
                    />
                    <div className="ml-4">
                      <p className="text-base font-bold text-gray-900 font-pj">Senait Alemu</p>
                      <p className="mt-0.5 text-sm font-pj text-gray-600">Nutrition Specialist</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
