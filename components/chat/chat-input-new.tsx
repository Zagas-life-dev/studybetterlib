"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export function ChatInput({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const supabase = createClient()
  
  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    // Set the height to the scrollHeight
    const newHeight = Math.min(textarea.scrollHeight, 200)
    textarea.style.height = `${newHeight}px`
  }, [message])

  // Send message function
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || !sessionId || submitting) return
    
    setSubmitting(true)
    
    try {
      // Check if we need to use the new chat tables
      const response = await fetch('/api/chat/compatibility')
      const { compatible } = await response.json()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "You need to be logged in to send messages.",
        })
        return
      }
      
      // Prepare message
      let userMessage = message.trim()
      setMessage("")
      
      // Insert user message using the appropriate table
      if (compatible) {
        // Use new chat_messages table
        const { error: userMessageError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            role: 'user',
            content: userMessage,
          })
          
        if (userMessageError) {
          throw new Error(`Failed to send message: ${userMessageError.message}`)
        }
        
        // Call the API to generate AI response
        const aiResponse = await fetch('/api/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            message: userMessage,
          }),
        })
        
        if (!aiResponse.ok) {
          const error = await aiResponse.text()
          throw new Error(`API error: ${error}`)
        }
      } else {
        // Use old ai_chat_messages table
        const { error: userMessageError } = await supabase
          .from('ai_chat_messages')
          .insert({
            session_id: sessionId,
            is_user: true,
            content: userMessage,
          })
          
        if (userMessageError) {
          throw new Error(`Failed to send message: ${userMessageError.message}`)
        }
        
        // Call the API to generate AI response
        const aiResponse = await fetch('/api/chat/message-old', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            message: userMessage,
          }),
        })
        
        if (!aiResponse.ok) {
          const error = await aiResponse.text()
          throw new Error(`API error: ${error}`)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        variant: "destructive",
        title: "Message Error",
        description: error instanceof Error ? error.message : "Failed to send message",
      })
      // Put the message back in the input if it failed to send
      setMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle key press for Ctrl+Enter to submit
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      sendMessage(e)
    }
  }

  return (
    <div className="border-t border-gray-800 p-4">
      <form onSubmit={sendMessage} className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="min-h-[40px] w-full resize-none bg-gray-800 border-gray-700 text-white focus-visible:ring-primary placeholder:text-gray-500 pr-10"
            disabled={submitting}
            rows={1}
            maxLength={4000}
          />
          <div className="absolute bottom-1 right-2 text-xs text-gray-500">
            {message.length > 0 && `${message.length}/4000`}
          </div>
        </div>
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim() || submitting} 
          className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white h-10 w-10"
        >
          {submitting ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <SendIcon className="h-5 w-5" />
          )}
        </Button>
      </form>
      <div className="mt-2 text-xs text-gray-500 text-right">
        Press Ctrl+Enter to send
      </div>
    </div>
  )
}