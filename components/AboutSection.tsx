'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const texts = [
    "Hello",
    "Morphing",
    "Text",
    "Animation",
    "React",
    "Component",
    "Smooth",
    "Transition",
    "Engaging",
  ];
  
  const itemVariants = {
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
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container px-4 mx-auto sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
    

       <motion.div variants={itemVariants} className="relative h-full flex items-center">
        <div className="absolute w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl transform rotate-3 scale-105 -z-10" />
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
              className="text-4xl md:text-5xl font-bold text-[#1a1942] mb-8 leading-tight"
            >
              We are doing more than you expect
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="text-gray-600 mb-10 leading-relaxed text-lg"
            >
              Welcome to Manyazewal eshetu gibi, a culinary oasis in the heart of Bole. Our restaurant offers a unique fusion of Ethiopian cultural dishes, international favorites, and innovative creations. From our organic ingredients to our attentive staff, every detail is crafted to elevate your dining experience.
            </motion.p>

            <motion.p 
              variants={itemVariants}
              className="text-gray-600 mb-10 leading-relaxed text-lg"
            >
              But we're more than just a restaurant. Discover our workspace services, enjoy a game of basketball, or join our transformative Saturday seminars featuring Manyazewal eshetu and other inspirational speakers. At Manyazewal, we're not just serving food - we're nourishing body, mind, and soul.
            </motion.p>

            <div className="grid grid-cols-2 gap-8">
              <motion.div variants={itemVariants} className="flex items-center gap-6">
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#1a1942]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#1a1942]">{count}</div>
                  <div className="text-gray-600 text-lg">Years of Excellence</div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-center gap-6">
                <div className="w-20 h-20 bg-orange-400 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#1a1942]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#1a1942]">100%</div>
                  <div className="text-gray-600 text-lg">Customer Satisfaction</div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

