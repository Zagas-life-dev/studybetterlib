import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import DashboardHeader from "@/components/dashboard-header"
import { ChatSidebar } from "@/components/chat/chat-sidebar-new"
import ScrollFixer from "./script"
import { checkChatDBCompatibility } from "@/app/actions/chat-new"
import { AgentChatInput } from "@/components/chat/chat-input-agent"
import { RealtimeChatMessages } from "@/components/chat/realtime-chat-messages-new"

function getUserInitials(email: string): string {
  const name = email.split("@")[0]
  return name
    .split(/[-._]/)
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Client component for Agent Chat Page
function AgentChatPageClient({ 
  sessionId, 
  userInitial 
}: { 
  sessionId: string | null
  userInitial: string
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4" id="chat-messages-container">
        {sessionId ? (
          <RealtimeChatMessages 
            key={sessionId} 
            sessionId={sessionId} 
            userInitial={userInitial}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="text-center max-w-md space-y-4">
              <h3 className="text-2xl font-semibold text-gray-200">
                Welcome to AI Agent Chat
              </h3>
              <p>
                Select an existing conversation from the sidebar or start a new one.
              </p>
              <p className="text-sm">
                You're using the enhanced Agent Completion API for more advanced AI capabilities.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {sessionId && (
        <AgentChatInput 
          sessionId={sessionId} 
          placeholder="Ask anything using our advanced AI agent..."
        />
      )}
    </>
  )
}

export default async function AgentChat({ 
  searchParams 
}: { 
  searchParams: { id?: string } 
}) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Get user initials
  const userInitial = getUserInitials(session.user.email || "")

  // Get selected chat session ID from URL params
  const selectedChatId = searchParams.id || null

  // Check if we should use the new chat tables
  const { compatible } = await checkChatDBCompatibility()
  
  // Fetch chat sessions
  let chatSessions = []
  
  if (compatible) {
    // Use new chat_sessions table
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, title, updated_at, pinned, tags")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      
    chatSessions = data || []
  } else {
    // Fall back to old ai_chat_sessions table
    const { data } = await supabase
      .from("ai_chat_sessions")
      .select("id, title, updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      
    chatSessions = data || []
  }

  // Fetch cart items count
  const { count: cartCount } = await supabase
    .from("cart_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id)

  return (
    <div className="inset-0 flex flex-col bg-black text-white h-screen">
      <ScrollFixer />
      <DashboardHeader session={session} cartCount={cartCount || 0} />

      <main className="container mx-auto px-4 py-4 flex-1 overflow-hidden relative">
        <div className="flex h-[calc(100vh-180px)]">
          {/* Main chat area - takes full width */}
          <div className="flex-1 h-full overflow-hidden">
            <Card className="bg-gray-900 border-gray-800 h-full flex flex-col shadow-xl rounded-xl">
              <AgentChatPageClient 
                sessionId={selectedChatId || null} 
                userInitial={userInitial} 
              />
            </Card>
          </div>
        </div>

        {/* Slideable sidebar - positioned absolutely */}
        <div className="absolute left-0 top-0 h-full z-50">
          <ChatSidebar initialSessions={chatSessions} agentMode={true} />
        </div>
      </main>
    </div>
  )
}