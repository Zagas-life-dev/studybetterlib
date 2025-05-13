"use client"

import React, { useState, useRef, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendHorizontal, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  sessionId: string
  disabled?: boolean
  autoFocus?: boolean
  placeholder?: string
}

const MAX_CHARS = 1000

export function AgentChatInput({ 
  sessionId, 
  disabled = false,
  autoFocus = true,
  placeholder = "Type your message..."
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  // Focus textarea on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= MAX_CHARS) {
      setMessage(newValue)
      
      // Set typing indicator
      setIsTyping(true)
      
      // Clear previous typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to clear typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 1000)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!message.trim() || isSubmitting || disabled) return

    setIsSubmitting(true)
    const messageContent = message.trim()
    setMessage("") // Clear input immediately

    try {
      // Update UI optimistically
      if (window.chatFunctions) {
        window.chatFunctions.addUserMessage(messageContent)
        window.chatFunctions.addAiLoadingMessage()
      }

      // Send to our new agent API endpoint
      const response = await fetch('/api/agents-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          message: messageContent
        })
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      if (result.message) {
        // Update loading message with actual response
        if (window.chatFunctions?.handleStreamingResponse) {
          window.chatFunctions.handleStreamingResponse(result.message)
        }
      }

      // Schedule a force refresh after 2 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        if (window.chatFunctions?.forceRefresh) {
          window.chatFunctions.forceRefresh()
        }
      }, 2000)

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    } catch (error: any) {
      console.error("Chat error:", error)
      const errorMessage = error.message || "Failed to send message"

      // Show error in chat
      if (window.chatFunctions?.updateLoadingMessageWithError) {
        window.chatFunctions.updateLoadingMessageWithError(errorMessage)
      }
      
      // Show error toast
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    
    // Expand textarea on Shift+Enter
    if (e.key === "Enter" && e.shiftKey) {
      // Let the newline happen naturally
    }
  }

  return (
    <div className="border-t border-gray-800 bg-gray-900 p-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex flex-col">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "min-h-[44px] max-h-[200px] pr-12",
              "bg-gray-950 border-gray-800 rounded-lg resize-none",
              "placeholder:text-gray-500 focus:border-purple-500",
              "transition-all duration-200 ease-in-out",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={isSubmitting || disabled}
          />
          
          <div className="absolute bottom-2 right-2">
            <Button 
              type="submit" 
              size="icon"
              disabled={isSubmitting || !message.trim() || disabled}
              className={cn(
                "h-8 w-8 rounded-full", 
                "bg-purple-600 hover:bg-purple-700",
                "transition-all duration-200",
                !message.trim() && "opacity-70"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex space-x-2">
            {/* Agent features could be added here later */}
          </div>
          
          <div className="text-xs text-gray-400">
            {message.length > 0 && `${message.length}/${MAX_CHARS}`}
            {isTyping && message.length === 0 && "Typing..."}
          </div>
        </div>
      </form>
      
      <div className="text-center mt-2 text-xs text-gray-500">
        Agent responses are generated and may not always be accurate.
      </div>
    </div>
  )
}