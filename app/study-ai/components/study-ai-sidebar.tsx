"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Plus, Search, Trash2, ChevronLeft, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface ChatSession {
  id: string
  title: string
  updated_at: string
}

interface StudyAIChatSidebarProps {
  initialSessions: ChatSession[]
  userId: string
  selectedChatId: string | null
}

export function StudyAIChatSidebar({ initialSessions, userId, selectedChatId }: StudyAIChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Filter sessions based on search query
  const filteredSessions = searchQuery
    ? sessions.filter((session) =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions

  // Set up realtime subscription for chat session updates
  useEffect(() => {
    const channel = supabase
      .channel("study_ai_chats_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_ai_chats",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Add new session to list
            setSessions((current) => [payload.new as ChatSession, ...current])
          } else if (payload.eventType === "UPDATE") {
            // Update the session in the list
            setSessions((current) =>
              current.map((session) =>
                session.id === payload.new.id
                  ? { ...session, ...payload.new as ChatSession }
                  : session
              )
            )
          } else if (payload.eventType === "DELETE") {
            // Remove session from list
            setSessions((current) =>
              current.filter((session) => session.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  // Responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Keep sidebar open on desktop by default
        setIsSidebarOpen(window.innerWidth >= 1024);
      } else {
        // Close sidebar on mobile by default
        setIsSidebarOpen(false);
      }
    };

    // Run once on mount
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Function to create a new chat session
  const handleCreateChat = async () => {
    if (isCreating) return
    setIsCreating(true)
    console.log("Creating new chat...")

    try {
      const { data, error } = await supabase
        .from("study_ai_chats")
        .insert([
          { user_id: userId, title: "New Chat" }
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating chat:", error)
        toast({
          title: "Error creating chat",
          description: error.message,
          variant: "destructive",
        })
      } else if (data) {
        console.log("Chat created successfully with ID:", data.id)
        // Navigate to the new chat
        router.push(`/study-ai?id=${data.id}`)
      }
    } catch (error) {
      console.error("Exception when creating chat:", error)
      toast({
        title: "Error creating chat",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Function to delete a chat session
  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const { error } = await supabase
        .from("study_ai_chats")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)

      if (error) {
        toast({
          title: "Error deleting chat",
          description: error.message,
          variant: "destructive",
        })
      } else {
        // If currently viewing the deleted chat, redirect to main study-ai page
        if (selectedChatId === id) {
          router.push("/study-ai")
        }

        toast({
          title: "Chat deleted",
          description: "Your chat has been deleted",
        })
      }
    } catch (error) {
      toast({
        title: "Error deleting chat",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Mobile sidebar toggle
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <>
      {/* Mobile sidebar toggle button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-16 left-4 z-10 md:hidden" 
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? <ChevronLeft /> : <Menu />}
      </Button>

      {/* Chat sidebar */}
      <aside
        className={cn(
          "bg-gray-900 w-full h-[calc(100vh-64px)] border-r border-gray-800 flex flex-col transition-all duration-300 absolute z-30 md:static top-16 bottom-0 left-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4 flex flex-col gap-4">
          <Button 
            variant="default" 
            className="bg-primary hover:bg-primary/90 text-white" 
            onClick={handleCreateChat}
            disabled={isCreating}
          >
            <Plus className="mr-2 h-4 w-4" /> 
            New Chat
          </Button>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-primary"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-4 text-gray-400 text-center">
              {searchQuery ? "No chats found" : "No chats yet. Start a new conversation!"}
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {filteredSessions.map((session) => (
                // Using standard anchor tag instead of Next.js Link for debugging
                <a
                  key={session.id}
                  href={`/study-ai?id=${session.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 group relative",
                    selectedChatId === session.id
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  )}
                  onClick={(e) => {
                    console.log(`Clicking chat session: ${session.id}`);
                    // Don't prevent default - let normal navigation happen
                  }}
                >
                  <MessageSquare className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm line-clamp-1 flex-1">{session.title}</span>
                  {selectedChatId !== session.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteChat(session.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}