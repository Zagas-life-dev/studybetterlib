import { createClient } from "@/utils/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card } from "@/components/ui/card"
import DashboardHeader from "@/components/dashboard-header"
import { ChatSidebar } from "@/components/chat/chat-sidebar-new"
import { RealtimeChatMessages } from "@/components/chat/realtime-chat-messages-new"
import { ChatInput } from "@/components/chat/chat-input-new"
import ScrollFixer from "./script"
import { checkChatDBCompatibility } from "@/app/actions/chat-new"
import { Badge } from "@/components/ui/badge"
import { PinIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function getUserInitials(email: string): string {
  const name = email.split("@")[0]
  return name
    .split(/[-._]/)
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Helper function to safely stringify error objects
function safeStringifyError(error: any): string {
  if (!error) return "Unknown error";
  
  try {
    if (typeof error === 'object') {
      return JSON.stringify({
        message: error.message || "No message",
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }
    return String(error);
  } catch (e) {
    return "Error cannot be stringified: " + String(e);
  }
}

// Tag colors to match the sidebar implementation
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

export default async function ChatSession({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = await createClient()
  
  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      redirect("/login")
    }

    const sessionId = params.id
    const userInitial = getUserInitials(session.user.email || "")
    
    // Check if we should use the new chat tables
    const { compatible } = await checkChatDBCompatibility()
    
    let chatSession: any
    let messages: any[]
    let chatSessions: any[]
    
    if (compatible) {
      // Use new chat_sessions table
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*, courses(*)")
        .eq("id", sessionId)
        .eq("user_id", session.user.id)
        .single()
        
      if (error || !data) {
        console.error(`Error fetching chat session: ${safeStringifyError(error)}`)
        return notFound()
      }
      
      chatSession = data
      
      // Fetch chat messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        
      if (messagesError) {
        console.error(`Error fetching messages: ${safeStringifyError(messagesError)}`)
        throw new Error(`Failed to fetch chat messages`)
      }
      
      messages = messagesData || []
      
      // Fetch all chat sessions for the sidebar
      const { data: sessionsData } = await supabase
        .from("chat_sessions")
        .select("id, title, updated_at, pinned, tags")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })
        
      chatSessions = sessionsData || []
    } else {
      // Fall back to old ai_chat_sessions table
      const { data, error } = await supabase
        .from("ai_chat_sessions")
        .select("*, courses(*)")
        .eq("id", sessionId)
        .eq("user_id", session.user.id)
        .single()
        
      if (error || !data) {
        console.error(`Error fetching chat session: ${safeStringifyError(error)}`)
        return notFound()
      }
      
      chatSession = data
      
      // Fetch chat messages and map old schema to new schema
      const { data: oldMessages, error: messagesError } = await supabase
        .from("ai_chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        
      if (messagesError) {
        console.error(`Error fetching messages: ${safeStringifyError(messagesError)}`)
        throw new Error(`Failed to fetch chat messages`)
      }
      
      // Convert old schema to new schema format
      messages = (oldMessages || []).map(msg => ({
        ...msg,
        role: msg.is_user ? "user" : "assistant"
      }))
      
      // Fetch all chat sessions for the sidebar
      const { data: sessionsData } = await supabase
        .from("ai_chat_sessions")
        .select("id, title, updated_at")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })
        
      chatSessions = sessionsData || []
    }

    // Fetch cart items count with minimal query
    const { count: cartCount, error: cartError } = await supabase
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)

    if (cartError) {
      console.error(`Error fetching cart count: ${safeStringifyError(cartError)}`)
    }

    return (
      <div className="inset-0 flex flex-col bg-black text-white h-screen">
        <ScrollFixer />
        <DashboardHeader session={session} cartCount={cartCount || 0} />

        <main className="container mx-auto px-4 py-4 flex-1 overflow-hidden relative">
          <div className="flex h-[calc(100vh-180px)]">
            {/* Main chat area - takes full width when sidebar is hidden */}
            <div className="flex-1 h-full overflow-hidden">
              <Card className="bg-gray-900 border-gray-800 h-full flex flex-col shadow-xl rounded-xl">
                <div className="border-b border-gray-800 p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold truncate">{chatSession.title}</h2>
                    <div className="flex items-center space-x-2 mt-1">
                      {chatSession.course_id && chatSession.courses?.title && (
                        <div className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs flex items-center">
                          <span className="block w-2 h-2 rounded-full bg-purple-500 mr-1"></span>
                          {chatSession.courses.title}
                        </div>
                      )}
                      
                      {chatSession.pinned && (
                        <div className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full text-xs flex items-center">
                          <PinIcon className="w-3 h-3 mr-1" />
                          Pinned
                        </div>
                      )}
                      
                      {chatSession.tags && chatSession.tags.length > 0 && (
                        <div className="flex space-x-1">
                          {chatSession.tags.map((tag: string) => (
                            <Badge 
                              key={tag}
                              className={cn(
                                "text-xs", 
                                TAG_COLORS[tag.toLowerCase()] || DEFAULT_TAG_COLOR
                              )}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-grow overflow-hidden">
                  <RealtimeChatMessages 
                    sessionId={sessionId} 
                    initialMessages={messages} 
                    userInitial={userInitial} 
                  />
                </div>

                <ChatInput sessionId={sessionId} />
              </Card>
            </div>
          </div>

          {/* Slideable sidebar - positioned absolutely */}
          <div className="absolute left-0 top-0 h-full z-50">
            <ChatSidebar initialSessions={chatSessions} />
          </div>
        </main>
      </div>
    )
  } catch (error) {
    // Safely log the error details
    const errorDetails = error instanceof Error 
      ? error.message 
      : safeStringifyError(error);
      
    console.error(`Unexpected error in chat session page: ${errorDetails}`);
    
    // For unexpected errors, redirect to the main chat page instead of showing a cryptic error
    redirect("/chat");
  }
}
