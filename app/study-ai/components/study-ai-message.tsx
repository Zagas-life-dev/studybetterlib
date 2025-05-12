"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamically import the heavy markdown and KaTeX components to prevent server/client hydration issues
const MarkdownRenderer = dynamic(
  () => import('./markdown-renderer'),
  { 
    loading: () => <Skeleton className="w-full h-20" />,
    ssr: false // Disable server-side rendering for this component
  }
)

interface Message {
  role: "user" | "assistant"
  content: string
}

interface StudyAIMessageProps {
  message: Message
  className?: string
}

export function StudyAIMessage({ message, className }: StudyAIMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Only render client-side to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div 
      ref={messageRef}
      className={cn(
        "overflow-x-auto",
        message.role === "user" 
          ? "bg-blue-800 text-white p-3 rounded-lg" 
          : "bg-gray-800 text-white p-3 rounded-lg",
        className
      )}
    >
      {message.role === "user" ? (
        <div className="whitespace-pre-wrap">{message.content}</div>
      ) : (
        mounted ? <MarkdownRenderer content={message.content} /> : <Skeleton className="w-full h-20" />
      )}
    </div>
  )
}