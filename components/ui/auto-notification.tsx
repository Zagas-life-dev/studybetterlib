"use client"

import { useEffect, useState } from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

export interface AutoNotificationProps {
  title: string
  message: string
  type?: "success" | "error" | "info"
  duration?: number
  onClose?: () => void
}

export function AutoNotification({
  title,
  message,
  type = "success",
  duration = 3000,
  onClose
}: AutoNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  // Icon and color based on notification type
  const iconMap = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <AlertCircle className="h-5 w-5 text-blue-500" />
  }

  const bgColorMap = {
    success: "bg-green-50 dark:bg-green-950/30",
    error: "bg-red-50 dark:bg-red-950/30",
    info: "bg-blue-50 dark:bg-blue-950/30"
  }

  const borderColorMap = {
    success: "border-green-500",
    error: "border-red-500",
    info: "border-blue-500"
  }

  const textColorMap = {
    success: "text-green-800 dark:text-green-200",
    error: "text-red-800 dark:text-red-200",
    info: "text-blue-800 dark:text-blue-200"
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onClose) setTimeout(onClose, 300) // Call onClose after exit animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const handleClose = () => {
    setIsVisible(false)
    if (onClose) setTimeout(onClose, 300) // Call onClose after exit animation
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-4 left-4 z-50 flex max-w-md rounded-md border ${borderColorMap[type]} ${bgColorMap[type]} p-4 shadow-md`}
        >
          <div className="mr-3 flex-shrink-0">{iconMap[type]}</div>
          <div className="flex-1">
            <h3 className={`font-medium ${textColorMap[type]}`}>{title}</h3>
            <p className={`mt-1 text-sm ${textColorMap[type]} opacity-90`}>{message}</p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}