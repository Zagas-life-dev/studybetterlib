"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { AutoNotification } from "./ui/auto-notification"

type NotificationType = "success" | "error" | "info"

type ShowNotificationOptions = {
  title: string
  message: string
  type?: NotificationType
  duration?: number
}

interface NotificationContextType {
  showNotification: (options: ShowNotificationOptions) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Array<ShowNotificationOptions & { id: string }>>([])

  const showNotification = useCallback((options: ShowNotificationOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    setNotifications(prev => [...prev, { ...options, id }])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notifications.map(notification => (
        <AutoNotification
          key={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type || "success"}
          duration={notification.duration || 3000}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}