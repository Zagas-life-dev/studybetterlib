"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Plus, Search, Trash2, ChevronLeft, Menu, Pin, PinIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "../ui/badge"

interface ChatSession {
  id: string
  title: string
  updated_at: string
  pinned?: boolean
  tags?: string[]
}

interface ChatSidebarProps {
  initialSessions: ChatSession[]
}

// Tag colors to match the page implementation
const TAG_COLORS: Record<string, string> = {
  "math": "bg-blue-600 hover:bg-blue-700",
  "science": "bg-green-600 hover:bg-green-700",
  "history": "bg-amber-600 hover:bg-amber-700",
  "english": "bg-red-600 hover:bg-red-700", 
  "important": "bg-purple-600 hover:bg-purple-700",
  "exam": "bg-pink-600 hover:bg-pink-700",
  "homework": "bg-cyan-600 hover:bg-cyan-700",
  "project": "bg-indigo-600 hover:bg-indigo-700",
  "question": "bg-orange-600 hover:bg-orange-700",
  "reference": "bg-teal-600 hover:bg-teal-700",
}

const DEFAULT_TAG_COLOR = "bg-gray-600 hover:bg-gray-700"

export function ChatSidebar({ initialSessions }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
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
    // Check if we need to use new chat tables
    const checkCompatible = async () => {
      try {
        const response = await fetch('/api/chat/compatibility');
        const { compatible } = await response.json();
        
        const tableName = compatible ? 'chat_sessions' : 'ai_chat_sessions';
        
        const channel = supabase
          .channel(`${tableName}_changes`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: tableName
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
      } catch (error) {
        console.error("Error setting up realtime subscription:", error);
      }
    };

    checkCompatible();
  }, [supabase])

  // Responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Keep sidebar open on desktop by default
        setIsSidebarOpen(false);
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

    try {
      // Check if we need to use new chat tables
      const response = await fetch('/api/chat/compatibility');
      const { compatible } = await response.json();
      
      const tableName = compatible ? 'chat_sessions' : 'ai_chat_sessions';
      
      const { data, error } = await supabase
        .from(tableName)
        .insert([
          { user_id: (await supabase.auth.getUser()).data.user?.id, title: "New Chat" }
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
        // Navigate to the new chat
        router.push(`/chat/${data.id}`)
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
          "bg-gray-900 w-80 h-[calc(100vh-64px)] border-r border-gray-800 flex flex-col transition-all duration-300 absolute z-30 top-16 bottom-0 left-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                <Link
                  key={session.id}
                  href={`/chat/${session.id}`}
                  className={cn(
                    "flex flex-col gap-1 rounded-md px-2 py-2 group relative",
                    location.pathname.includes(`/chat/${session.id}`) 
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  )}
                >
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 flex-shrink-0 mr-2" />
                    <span className="text-sm line-clamp-1 flex-1">{session.title}</span>
                    {session.pinned && (
                      <PinIcon className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  
                  {session.tags && session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {session.tags.map((tag) => (
                        <Badge 
                          key={tag}
                          variant="outline"
                          className={cn(
                            "text-xs py-0 px-1", 
                            TAG_COLORS[tag.toLowerCase()] || DEFAULT_TAG_COLOR
                          )}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}