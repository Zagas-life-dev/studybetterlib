import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Book, Clock, FileText, BookOpen } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header" 

export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  // Fetch user stats
  const { data: userStats } = await supabase.from("user_stats").select("*").eq("user_id", session.user.id).single()

  // Fetch user's courses with progress
  const { data: userCourses } = await supabase
    .from("learning_progress")
    .select("*, courses(*)")
    .eq("user_id", session.user.id)
    .order("last_accessed", { ascending: false })
    .limit(3)

  // Fetch cart items count
  const { count: cartCount } = await supabase
    .from("cart_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id)

  // Get user's first name
  const fullName = profile?.full_name || session.user.email?.split("@")[0] || "there"
  const firstName = fullName.split(" ")[0].toLowerCase()

  // Default stats if not available
  const stats = userStats || {
    total_courses: 0,
    total_hours: 0,
    total_notes: 0,
    courses_completed: 0,
    materials_studied: 0,
    ai_chats_completed: 0,
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader session={session} cartCount={cartCount || 0} />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Welcome Section - 2/3 width */}
          <div className="md:col-span-3">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-500 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-2">Hey, {firstName}!</h2>
              <p className="mb-4 text-white/80">Check out the library for course. More features coming soon...</p>
              <p className="mb-6">Save up to 10% with our combo plans</p>
            </div>
          </div>

          
        </div>

       

        {/* Your Courses Section */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle>Access Your Courses</CardTitle>
            <CardDescription>How to Access Your Courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-md">
                <FileText className="text-purple-400 h-5 w-5" />
                <span>Download your courses after payment and save to your device.</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-md">
                <BookOpen className="text-blue-400 h-5 w-5" />
                <span>Can't find your course? Check your email for download instructions.</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-md">
                <Clock className="text-green-400 h-5 w-5" />
                <span>Still having issues? Reach out to us using the feedback system.</span>
              </div>
            </div>
                      
              
            
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
