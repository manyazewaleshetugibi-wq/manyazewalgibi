'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)

  const testimonials = [
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
    },
    {
      quote: "The best Ethiopian restaurant in town! The staff is friendly and the atmosphere is warm and inviting.",
      name: "Abebe Bekele",
      title: "Regular Customer",
      rating: 5
    },
    {
      quote: "Incredible food and amazing hospitality. Highly recommend the kitfo and tibs!",
      name: "Tigist Mamo",
      title: "Food Blogger",
      rating: 5
    }
  ]

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const updateScrollInfo = () => {
      setContainerWidth(scrollContainer.clientWidth)
      const newIndex = Math.round(scrollContainer.scrollLeft / scrollContainer.clientWidth)
      setCurrentIndex(newIndex)
    }

    updateScrollInfo()
    scrollContainer.addEventListener('scroll', updateScrollInfo)
    window.addEventListener('resize', updateScrollInfo)

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollInfo)
      window.removeEventListener('resize', updateScrollInfo)
    }
  }, [isMobile])

  const scrollToIndex = (index: number) => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer || !containerWidth) return
    
    const newScrollLeft = index * containerWidth
    scrollContainer.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })
    setCurrentIndex(index)
  }

  const scrollNext = () => {
    if (currentIndex < testimonials.length - 1) {
      scrollToIndex(currentIndex + 1)
    }
  }

  const scrollPrev = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1)
    }
  }

  const totalDots = testimonials.length

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      id="reviews" 
      className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-b from-white to-purple-50/30 overflow-hidden"
    >
      <div className="px-3 sm:px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="text-center">
            <div className="flex justify-center mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                <Quote className="w-5 h-5 sm:w-8 sm:h-8 text-purple-900" />
              </div>
            </div>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-purple-900">
              {testimonials.length}+ people have said how good Manyazewal Eshetu's restaurant is
            </p>
            <h2 className="mt-2 sm:mt-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-purple-900">
              Our happy clients say about us
            </h2>
          </div>

          <div className="relative w-full mt-8 sm:mt-12 md:mt-16 lg:mt-20 xl:mt-24">
            {/* Navigation Arrows - Hidden on mobile, visible on desktop */}
            {!isMobile && (
              <>
                <button
                  onClick={scrollPrev}
                  disabled={currentIndex === 0}
                  className={`
                    absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg border border-purple-200 text-purple-900 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : ''}
                  `}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={scrollNext}
                  disabled={currentIndex === totalDots - 1}
                  className={`
                    absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg border border-purple-200 text-purple-900 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    ${currentIndex === totalDots - 1 ? 'opacity-0 pointer-events-none' : ''}
                  `}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Horizontal Scroll Container - One card per screen on mobile, 3 cards on desktop */}
            <div
              ref={scrollContainerRef}
              className={`
                flex overflow-x-auto scroll-smooth snap-x snap-mandatory
                ${isMobile ? 'gap-4 pb-6' : 'gap-6 md:gap-8 justify-center'}
                hide-scrollbar
              `}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -3 }}
                  className={`
                    flex-shrink-0 snap-start
                    ${isMobile ? 'w-full' : 'w-full md:w-[calc(33.333%-16px)] lg:w-[calc(33.333%-21px)]'}
                  `}
                >
                  <div className="flex flex-col overflow-hidden shadow-lg sm:shadow-xl rounded-xl sm:rounded-2xl bg-white border border-purple-100 hover:border-purple-300 transition-all h-full mx-auto max-w-md sm:max-w-none">
                    <div className="flex flex-col justify-between flex-1 p-5 sm:p-6 md:p-6 lg:p-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-purple-900 text-purple-900" />
                          ))}
                        </div>

                        <blockquote className="flex-1 mt-4 sm:mt-5 md:mt-6">
                          <p className="text-sm sm:text-base md:text-lg leading-relaxed text-gray-700">
                            "{testimonial.quote}"
                          </p>
                        </blockquote>
                      </div>

                      <div className="flex items-center mt-6 sm:mt-5 md:mt-6">
                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-purple-200">
                          <Image
                            className="object-cover"
                            src="/man_logo.jpg"
                            alt={testimonial.name}
                            fill
                            sizes="(max-width: 640px) 40px, 48px"
                          />
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <p className="text-sm sm:text-base font-bold text-purple-900">
                            {testimonial.name}
                          </p>
                          <p className="mt-0.5 text-xs sm:text-sm text-gray-600">
                            {testimonial.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Dot Indicators - Only visible on mobile, hidden on desktop */}
            {isMobile && (
              <>
                <div className="flex justify-center gap-2 mt-6 sm:mt-8">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToIndex(index)}
                      className={`
                        transition-all duration-300 rounded-full
                        h-2
                        ${
                          currentIndex === index
                            ? 'bg-purple-900 w-8'
                            : 'bg-purple-300 hover:bg-purple-400 w-2'
                        }
                      `}
                      aria-label={`Go to testimonial ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Scroll hint for mobile */}
                <div className="text-center mt-4">
                  <p className="text-[11px] text-purple-400 animate-pulse">
                    ← Swipe left or right →
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </motion.section>
  )
}