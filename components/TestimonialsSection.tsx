'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Star, Quote } from 'lucide-react'

export function TestimonialsSection() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      id="reviews" 
      className="py-12 bg-gradient-to-b from-white to-purple-50/30 sm:py-16 lg:py-20"
    >
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Quote className="w-8 h-8 text-purple-900" />
              </div>
            </div>
            <p className="text-lg font-medium text-purple-900 font-pj">170 people have said how good Manyazewal Eshetu's restaurant is</p>
            <h2 className="mt-4 text-3xl font-bold text-purple-900 sm:text-4xl xl:text-5xl font-pj">Our happy clients say about us</h2>
          </div>

          <div className="relative mt-10 md:mt-24 md:order-2">
            <div className="absolute -inset-x-1 inset-y-16 md:-inset-x-2 md:-inset-y-6">
              <div className="w-full h-full max-w-5xl mx-auto rounded-3xl opacity-30 blur-lg filter" style={{ background: 'linear-gradient(90deg, #6b21a5 -0.55%, #7e22ce 22.86%, #8b44ff 48.36%, #a855f7 73.33%, #c084fc 99.34%)' }}></div>
            </div>

            <div className="relative grid max-w-lg grid-cols-1 gap-6 mx-auto md:max-w-none lg:gap-10 md:grid-cols-3">
              {[
                {
                  quote: "The flavors at Manyazewal Eshetu's restaurant are a masterpiece of Ethiopian culture. The injera and doro wat are unmatched.",
                  name: "Mahlet Asfaw",
                  title: "Food Critic",
                  rating: 5
                },
                {
                  quote: "Dining here feels like a journey through Ethiopia. The coffee ceremony and live music are magical.",
                  name: "Yonas Tadesse",
                  title: "Cultural Enthusiast",
                  rating: 5
                },
                {
                  quote: "As a vegetarian, I loved the shiro and beyainatu. Authentic and fulfilling dishes.",
                  name: "Senait Alemu",
                  title: "Nutrition Specialist",
                  rating: 5
                }
              ].map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="flex flex-col overflow-hidden shadow-xl rounded-2xl bg-white border-2 border-purple-100 hover:border-purple-300 transition-all"
                >
                  <div className="flex flex-col justify-between flex-1 p-6 lg:py-8 lg:px-7">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-purple-900 text-purple-900" />
                        ))}
                      </div>

                      <blockquote className="flex-1 mt-8">
                        <p className="text-lg leading-relaxed text-gray-700 font-pj">"{testimonial.quote}"</p>
                      </blockquote>
                    </div>

                    <div className="flex items-center mt-8">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-purple-200">
                        <Image
                          className="object-cover"
                          src="/man_logo.jpg"
                          alt={testimonial.name}
                          fill
                        />
                      </div>
                      <div className="ml-4">
                        <p className="text-base font-bold text-purple-900 font-pj">{testimonial.name}</p>
                        <p className="mt-0.5 text-sm font-pj text-gray-600">{testimonial.title}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
