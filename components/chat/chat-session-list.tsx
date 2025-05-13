"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Plus, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createChatSession, deleteChatSession } from "@/app/actions/chat-new"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"

interface ChatSession {
  id: string
  title: string
  updated_at: string
}

interface ChatSessionListProps {
  initialSessions: ChatSession[]
}

export function ChatSessionList({ initialSessions }: ChatSessionListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Set up realtime subscription for chat session updates
  useEffect(() => {
    const channel = supabase
      .channel("chat_sessions_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ai_chat_sessions",
        },
        (payload) => {
          // Update the session in the list
          setSessions((current) =>
            current.map((session) =>
              session.id === payload.new.id
                ? { ...session, title: payload.new.title, updated_at: payload.new.updated_at }
                : session,
            ),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filteredSessions = sessions.filter((session) => session.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleCreateSession = async () => {
    if (isCreating) return

    setIsCreating(true)
    setErrorMessage(null)

    try {
      const result = await createChatSession("New Chat")

      if (result.error) {
        setErrorMessage(result.error)
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        console.error("Error creating chat:", result.error)
      } else if (result.sessionId) {
        // Add the new session to the list
        const newSession = {
          id: result.sessionId,
          title: "New Chat",
          updated_at: new Date().toISOString(),
        }

        setSessions([newSession, ...sessions])

        // Navigate to the new chat
        console.log("Chat created successfully, navigating to:", `/chat/${result.sessionId}`)
        router.push(`/chat/${result.sessionId}`)
      } else {
        const msg = "Unknown error: No session ID or error returned"
        setErrorMessage(msg)
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        })
        console.error(msg)
      }
    } catch (error: any) {
      const msg = error.message || "Failed to create new chat. Please try again."
      setErrorMessage(msg)
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
      console.error("Exception creating chat:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this chat?")) return

    try {
      const result = await deleteChatSession(sessionId)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        // Remove the deleted session from the list
        setSessions(sessions.filter((session) => session.id !== sessionId))

        // If we're currently viewing the deleted session, redirect to /chat
        if (pathname === `/chat/${sessionId}`) {
          router.push("/chat")
        }

        toast({
          title: "Chat deleted",
          description: "The chat has been deleted successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="chat-list-container flex flex-col h-full">
      <div className="p-4">
        <Button onClick={handleCreateSession} className="w-full mb-4" disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? "Creating..." : "New Chat"}
        </Button>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-sm text-red-200">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search chats..."
            className="pl-9 bg-gray-900 border-gray-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredSessions.length > 0 ? (
          <div className="space-y-1 px-2">
            {filteredSessions.map((session) => (
              <Link
                key={session.id}
                href={`/chat/${session.id}`}
                className={cn(
                  "flex items-center justify-between p-3 rounded-md hover:bg-gray-800 transition-colors",
                  pathname === `/chat/${session.id}` && "bg-gray-800",
                )}
                onClick={() => {
                  // Close mobile sidebar when a session is selected
                  const sidebar = document.getElementById("mobile-sidebar")
                  if (sidebar && window.innerWidth < 768) {
                    sidebar.classList.add("-translate-x-full")
                  }
                }}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <MessageSquare className="h-5 w-5 mr-3 text-purple-500 flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{session.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(session.updated_at).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-400/10 flex-shrink-0 ml-2"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <p className="text-gray-400">{searchQuery ? "No chats match your search" : "No chat history yet"}</p>
          </div>
        )}
      </div>
    </div>
  )
}
