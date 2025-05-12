"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/ui/avatar"
import { Bot, Send, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { StudyAIMessage } from "./study-ai-message"

interface Message {
  id?: string
  role: "user" | "assistant"
  content: string
  createdAt?: string
}

interface StudyAIChatProps {
  chatId: string | null
  userId: string
  userInitial: string
}

export function StudyAIChat({ chatId, userId, userInitial }: StudyAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Load chat messages when chatId changes
  useEffect(() => {
    if (chatId) {
      console.log(`Attempting to load messages for chat ID: ${chatId}`)
      loadMessages(chatId)
    } else {
      console.log('No chat ID provided, showing empty state')
      setMessages([])
    }
  }, [chatId])

  // Set up realtime subscriptions for new messages
  useEffect(() => {
    if (!chatId) return

    const channel = supabase
      .channel(`study_ai_messages_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "study_ai_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = {
            id: payload.new.id,
            role: payload.new.role,
            content: payload.new.content,
            createdAt: payload.new.created_at,
          }
          setMessages((currentMessages) => [...currentMessages, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, chatId])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Enable sending message with Enter (Shift+Enter for new line)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && document.activeElement === textareaRef.current) {
        e.preventDefault()
        handleSendMessage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [input, isLoading])

  // Function to load messages for a chat
  const loadMessages = async (chatId: string) => {
    try {
      console.log(`Fetching messages for chat ID: ${chatId}`)
      const { data, error } = await supabase
        .from("study_ai_messages")
        .select("id, role, content, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Supabase error loading messages:", error)
        throw error
      }
      
      console.log(`Successfully loaded ${data?.length || 0} messages:`, data)
      
      if (data && data.length > 0) {
        setMessages(
          data.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.created_at,
          }))
        )
      } else {
        console.log("No messages found for this chat")
        // If no messages, show an empty state but still indicate we're in a valid chat
        setMessages([])
      }
      setIsError(false)
    } catch (error) {
      console.error("Error loading messages:", error)
      setIsError(true)
      toast({
        title: "Failed to load messages",
        description: "Could not load chat history. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Function to send a message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)

    // Add user message to state immediately for UI responsiveness
    const tempUserMessage = {
      role: "user" as const,
      content: userMessage,
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      // If no chat exists yet, create one
      let currentChatId = chatId
      
      if (!currentChatId) {
        // Create a new chat with the first message as title
        const { data: chatData, error: chatError } = await supabase
          .from("study_ai_chats")
          .insert([
            {
              user_id: userId,
              title: userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : ""),
            },
          ])
          .select("id")
          .single()

        if (chatError) throw chatError
        
        currentChatId = chatData.id
        router.push(`/study-ai?id=${currentChatId}`)
      }

      // Set up a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout

      try {
        // Call our API to process the message
        const response = await fetch("/api/study-ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId: currentChatId,
            message: userMessage,
          }),
          signal: controller.signal
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
          throw new Error(errorData.error || `Error ${response.status}: Failed to send message`);
        }
      } catch (fetchError: any) {
        // Handle specific abort/timeout errors with a friendly message
        if (fetchError.name === 'AbortError') {
          throw new Error("Request timed out. Your message may have been too long or the service is busy.");
        }
        throw fetchError;
      }

      // AI response is received via the realtime subscription
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast({
        title: "Failed to send message",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })

      // Show error in chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process your request. Please try again later.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const EmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <Bot className="h-12 w-12 mb-4 text-primary" />
      <h2 className="text-2xl font-semibold mb-2">Welcome to Study AI</h2>
      <p className="text-gray-400 mb-4 max-w-md">
        Your personal AI study assistant. Ask me anything about your studies, 
        and I'll help you understand complex concepts.
      </p>
      <p className="text-gray-500 mb-6 text-sm max-w-md">
        I can explain math and science concepts, help with problems, and provide study tips.
      </p>
      <div className="space-y-2 w-full max-w-md">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => setInput("Explain the quadratic formula and how to use it")}
        >
          Explain the quadratic formula and how to use it
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => setInput("What's the difference between mitosis and meiosis?")}
        >
          What's the difference between mitosis and meiosis?
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => setInput("Help me understand Newton's laws of motion")}
        >
          Help me understand Newton's laws of motion
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4" id="chat-messages-container">
        {chatId ? (
          messages.length > 0 ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex items-start gap-3 ${
                    message.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 bg-primary text-white">
                      <Bot className="h-5 w-5" />
                    </Avatar>
                  )}
                  
                  <div className="flex-1 max-w-[80%]">
                    <StudyAIMessage message={message} />
                  </div>
                  
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 bg-gray-700 text-white">
                      <span>{userInitial}</span>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 bg-primary text-white">
                    <Bot className="h-5 w-5" />
                  </Avatar>
                  <div className="bg-gray-800 text-white p-3 rounded-lg">
                    <div className="h-6 flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Bot className="h-12 w-12 mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">Start a Conversation</h2>
              <p className="text-gray-400 mb-4 max-w-md">
                This is a new chat. Ask Study AI anything about your studies!
              </p>
              <div className="space-y-2 w-full max-w-md">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setInput("Explain the quadratic formula and how to use it")}
                >
                  Explain the quadratic formula and how to use it
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setInput("What's the difference between mitosis and meiosis?")}
                >
                  What's the difference between mitosis and meiosis?
                </Button>
              </div>
            </div>
          )
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Chat input area */}
      <div className="p-4 border-t border-gray-800">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Ask Study AI for help with your studies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[60px] pl-4 pr-12 py-3 bg-gray-800 border-gray-700 text-white resize-none"
              disabled={isLoading}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                }
              }}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send message. Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  )
}