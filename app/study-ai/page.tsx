import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import { StudyAIChat } from "@/app/study-ai/components/study-ai-chat"
import { StudyAIChatSidebar } from "@/app/study-ai/components/study-ai-sidebar"
import DebugInfo from "@/app/study-ai/components/debug-info"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Study AI Chat",
  description: "Chat with Study AI to get help with your studies",
}

function getUserInitials(email: string): string {
  const name = email.split("@")[0]
  return name
    .split(/[-._]/)
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Use a client component wrapper to avoid hydration issues ededaw oden
// to force chages 
export default async function StudyAIPage({
  searchParams,
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

  const userInitial = getUserInitials(session.user.email || "")
  const selectedChatId = searchParams.id || null

  // Fetch cart items count for header
  const { count: cartCount } = await supabase
    .from("cart_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id)

  // Fetch user's study AI chat sessions
  const { data: chatSessions } = await supabase
    .from("study_ai_chats")
    .select("id, title, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })

  return (
    <div className="flex flex-col min-h-screen bg-black text-white" suppressHydrationWarning>
      <DashboardHeader session={session} cartCount={cartCount || 0} />
      
      <main className="container mx-auto flex-1 flex overflow-hidden relative">
        {/* Sidebar for chat sessions */}
        <div className="w-full md:w-80 md:flex md:flex-shrink-0">
          <StudyAIChatSidebar 
            initialSessions={chatSessions || []} 
            userId={session.user.id} 
            selectedChatId={selectedChatId}
          />
        </div>
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <StudyAIChat 
            userInitial={userInitial} 
            chatId={selectedChatId} 
            userId={session.user.id} 
          />
        </div>
      </main>
      
      {/* Debug info component */}
      <DebugInfo />
    </div>
  )
}
