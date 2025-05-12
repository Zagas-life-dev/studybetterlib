import { Metadata } from "next"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import FeedbackForm from "@/components/feedback-form"
import DashboardHeader from "@/components/dashboard-header" 

export const metadata: Metadata = {
  title: "Feedback - Study Better",
  description: "Share your thoughts and suggestions to help us improve.",
}

export default async function FeedbackPage() {
  // Get user session if available
  const cookieStore = cookies()
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  
  return (
    <div>
      {session ? (
        <DashboardHeader session={session} cartCount={0} />
      ) : (
        // You can replace this with a simpler header for non-authenticated users
        <div className="border-b py-4">
          <div className="container">
            <h2 className="text-lg font-semibold">Study Better</h2>
          </div>
        </div>
      )}
      <div className="container py-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Feedback</h1>
            <p className="text-muted-foreground">
              We're constantly working to improve your experience. Let us know how we're doing.
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <FeedbackForm 
              userEmail={user?.email} 
              isAuthenticated={!!user} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}