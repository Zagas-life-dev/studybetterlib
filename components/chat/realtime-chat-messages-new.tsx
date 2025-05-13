"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  session_id?: string
}

export function RealtimeChatMessages({ 
  sessionId, 
  initialMessages = [],
  userInitial
}: { 
  sessionId: string
  initialMessages?: Message[]
  userInitial: string 
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [loading, setLoading] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load messages when component mounts or sessionId changes
  useEffect(() => {
    if (!sessionId) return

    const fetchMessages = async () => {
      setLoading(true)
      
      try {
        // Check if we need to use the new chat tables
        const response = await fetch('/api/chat/compatibility');
        const { compatible } = await response.json();
        
        const tableName = compatible ? 'chat_messages' : 'ai_chat_messages';
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq(compatible ? 'session_id' : 'session_id', sessionId)
          .order('created_at', { ascending: true })
        
        if (error) {
          console.error('Error fetching messages:', error)
        } else if (data) {
          // If using old schema, convert to new schema format
          if (!compatible) {
            setMessages(data.map((msg: any) => ({
              ...msg,
              role: msg.is_user ? 'user' : 'assistant'
            })))
          } else {
            setMessages(data)
          }
        }
      } catch (error) {
        console.error('Error in fetchMessages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
    
    // Set up realtime subscription
    const setupSubscription = async () => {
      try {
        const response = await fetch('/api/chat/compatibility');
        const { compatible } = await response.json();
        
        const tableName = compatible ? 'chat_messages' : 'ai_chat_messages';
        
        const channel = supabase
          .channel(`${tableName}_${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: tableName,
              filter: compatible 
                ? `session_id=eq.${sessionId}`
                : `session_id=eq.${sessionId}`
            },
            (payload) => {
              const newMessage = payload.new as Message
              
              // Convert from old schema to new schema if needed
              if (!compatible) {
                const convertedMessage = {
                  ...newMessage,
                  role: (newMessage as any).is_user ? 'user' : 'assistant'
                }
                setMessages((current) => [...current, convertedMessage])
              } else {
                setMessages((current) => [...current, newMessage])
              }
            }
          )
          .subscribe()
          
        return () => {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.error('Error setting up subscription:', error)
      }
    }
    
    const cleanup = setupSubscription()
    return () => {
      cleanup.then(unsubscribe => unsubscribe && unsubscribe())
    }
  }, [sessionId, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Format message content with basic markdown-like syntax
  const formatContent = (content: string) => {
    if (!content) return ''
    
    // Replace code blocks
    let formatted = content.replace(
      /```([a-z]*)([\s\S]*?)```/g, 
      '<pre><code class="language-$1">$2</code></pre>'
    )
    
    // Replace inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Replace bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    
    // Replace italic text
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    
    // Replace newlines with break tags
    formatted = formatted.replace(/\n/g, '<br>')
    
    return formatted
  }

  return (
    <div id="chat-messages-container" className="flex flex-col space-y-4 p-4 overflow-y-auto">
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        messages.map((message) => (
          <div 
            key={message.id} 
            className={cn(
              "flex items-start gap-3 max-w-3xl",
              message.role === "user" ? "ml-auto" : "mr-auto"
            )}
          >
            {message.role !== "user" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                AI
              </div>
            )}
            <div
              className={cn(
                "rounded-lg p-3",
                message.role === "user" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-100"
              )}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                className={cn(
                  "prose-sm",
                  "prose-headings:font-semibold prose-headings:text-white prose-h1:text-lg prose-h2:text-base prose-h3:text-sm",
                  "prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-md prose-pre:overflow-x-auto",
                  "prose-code:bg-gray-700 prose-code:rounded prose-code:px-1",
                  message.role === "user" 
                    ? "prose-pre:bg-blue-700 prose-pre:border-blue-500 prose-code:bg-blue-500" 
                    : "prose-pre:bg-gray-700 prose-pre:border-gray-600 prose-code:bg-gray-600"
                )}
              />
            </div>
            {message.role === "user" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                {userInitial}
              </div>
            )}
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}