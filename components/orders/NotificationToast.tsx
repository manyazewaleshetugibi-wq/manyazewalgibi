// components/orders/NotificationToast.tsx
"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { BellRing, XCircle } from "lucide-react"

interface NotificationToastProps {
  title: string
  message: string
  onClose: () => void
}

export const NotificationToast = ({ title, message, onClose }: NotificationToastProps) => (
  <motion.div
    initial={{ opacity: 0, y: -50, x: "-50%" }}
    animate={{ opacity: 1, y: 0, x: "-50%" }}
    exit={{ opacity: 0, y: -50, x: "-50%" }}
    className="fixed top-4 left-1/2 z-50 w-[90%] max-w-md"
  >
    <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <BellRing className="h-5 w-5 text-green-600 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800">{title}</p>
            <p className="text-xs text-green-700 mt-1">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 text-green-600 hover:text-green-800 hover:bg-green-100"
            onClick={onClose}
          >
            <XCircle className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="h-1 bg-green-500 animate-progress" style={{ animationDuration: "4000ms" }} />
    </div>
  </motion.div>
)

export const notificationStyles = `
  @keyframes progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
  .animate-progress {
    animation: progress linear forwards;
  }
`