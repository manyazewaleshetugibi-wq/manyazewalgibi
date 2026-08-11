'use client'

import Image from 'next/image'
import { motion, type Variants } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useState, useEffect } from 'react'

export function AboutSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [count, setCount] = useState(0)
  useEffect(() => {
    if (inView) {
      const interval = setInterval(() => {
        setCount((prevCount) => {
          if (prevCount < 6) {
            return prevCount + 1
          }
          clearInterval(interval)
          return prevCount
        })
      }, 100)
      return () => clearInterval(interval)
    }
  }, [inView])

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    },
  }

  return (
    <section className="pt-12 md:pt-24 pb-0 bg-gradient-to-b from-white to-purple-50/30">
      <div className="container px-4 mx-auto sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center"
        >
          <motion.div variants={itemVariants} className="relative h-full flex items-center">
            <div className="absolute w-full h-full bg-gradient-to-br from-purple-800 to-purple-900 rounded-3xl transform rotate-3 scale-105 -z-10 opacity-20" />
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/mane.jpeg"
                alt="Manyazewal staff preparing drinks"
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>

          <div className="lg:pl-8">
            <motion.h2 
              variants={itemVariants}
              className="text-2xl md:text-4xl lg:text-5xl font-bold text-purple-900 mb-4 md:mb-8 leading-tight"
            >
              We are doing more than you expect
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="text-gray-600 mb-4 md:mb-10 leading-relaxed text-sm md:text-base lg:text-lg"
            >
              Welcome to Manyazewal Eshetu Gibi, a culinary oasis in the heart of Bole. Our restaurant offers a unique fusion of Ethiopian cultural dishes, international favorites, and innovative creations. From our organic ingredients to our attentive staff, every detail is crafted to elevate your dining experience.
            </motion.p>

            <motion.p 
              variants={itemVariants}
              className="text-gray-600 mb-6 md:mb-10 leading-relaxed text-sm md:text-base lg:text-lg"
            >
              But we're more than just a restaurant. Discover our workspace services, enjoy a game of basketball, or join our transformative Saturday seminars featuring Manyazewal Eshetu and other inspirational speakers. At Manyazewal, we're not just serving food - we're nourishing body, mind, and soul.
            </motion.p>

            {/* Stats Section - Inline on mobile, without icons */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-row justify-between items-center gap-3 md:gap-4 lg:gap-8"
            >
              {/* Years of Excellence */}
              <div className="flex-1 text-center">
                <div className="text-xl md:text-2xl lg:text-4xl font-bold text-purple-900">{count}</div>
                <div className="text-xs md:text-sm lg:text-lg text-gray-600">Years of Excellence</div>
              </div>

              {/* Customer Satisfaction */}
              <div className="flex-1 text-center">
                <div className="text-xl md:text-2xl lg:text-4xl font-bold text-purple-900">99.9%</div>
                <div className="text-xs md:text-sm lg:text-lg text-gray-600">Customer Satisfaction</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}