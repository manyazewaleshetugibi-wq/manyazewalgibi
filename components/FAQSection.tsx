'use client'

import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HelpCircle } from 'lucide-react'

export function FAQSection() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="py-16 bg-gradient-to-b from-purple-50/30 to-white"
    >
      <div className="container px-4 mx-auto sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <HelpCircle className="w-8 h-8 text-purple-900" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-purple-900 sm:text-4xl">Frequently Asked Questions</h2>
          <p className="mt-4 text-lg text-gray-600">Find answers to common questions about our restaurant</p>
        </div>
        <div className="max-w-3xl mx-auto mt-12">
          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                question: "What are your opening hours?",
                answer: "We are open daily from 11:00 AM to 10:00 PM."
              },
              {
                question: "Do you take reservations?",
                answer: "Yes, we accept reservations through our website or by phone."
              },
              {
                question: "Is parking available?",
                answer: "Yes, we have free parking available for our customers."
              },
              {
                question: "Do you offer vegetarian options?",
                answer: "Yes, we have a wide selection of vegetarian dishes on our menu."
              },
              {
                question: "Where is the second branch ManyazewalEshetuGibi2 Restaurant located?",
                answer: "ManyazewalEshetuGibi2 Restaurant is located at Bole Subcity, Woreda 03, near Friendship Park, Addis Ababa, Ethiopia."
              }
            ].map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-2 border-purple-100 rounded-xl px-2 bg-white hover:border-purple-200 transition-colors"
              >
                <AccordionTrigger className="text-purple-900 hover:text-purple-700 font-semibold">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </motion.section>
  )
}