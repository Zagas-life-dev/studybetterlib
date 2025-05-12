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
          <div className="md:col-span-2">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-500 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-2">Welcome back, {firstName}!</h2>
              <p className="mb-4 text-white/80">Track your learning progress and discover new courses.</p>
              <p className="mb-6">Continue your learning journey today.</p>
              <Button variant="secondary" className="bg-white text-purple-700 hover:bg-gray-100">
                Resume Learning
              </Button>
            </div>
          </div>

          {/* Profile Section - 1/3 width */}
          <div className="md:col-span-1">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
                  <AvatarFallback className="bg-gray-800 text-2xl">{firstName.charAt(0).toLowerCase()}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-medium mb-1">{firstName}</h3>
                <p className="text-gray-400 text-sm mb-4">{session.user.email}</p>
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Stats Section */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
              <CardDescription>Your learning activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <div className="bg-gray-800 p-3 rounded-full mb-3">
                    <Book className="h-6 w-6 text-purple-500" />
                  </div>
                  <span className="text-2xl font-bold">{stats.total_courses}</span>
                  <span className="text-gray-400 text-sm">Courses</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-gray-800 p-3 rounded-full mb-3">
                    <Clock className="h-6 w-6 text-purple-500" />
                  </div>
                  <span className="text-2xl font-bold">{stats.total_hours}</span>
                  <span className="text-gray-400 text-sm">Hours</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-gray-800 p-3 rounded-full mb-3">
                    <FileText className="h-6 w-6 text-purple-500" />
                  </div>
                  <span className="text-2xl font-bold">{stats.total_notes}</span>
                  <span className="text-gray-400 text-sm">Notes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Progress Section */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
              <CardDescription>Your achievements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Courses Completed</span>
                  <span className="text-sm">{stats.courses_completed}/0</span>
                </div>
                <Progress value={0} className="h-2 bg-gray-800" indicatorClassName="bg-purple-600" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Materials Studied</span>
                  <span className="text-sm">{stats.materials_studied}/0</span>
                </div>
                <Progress value={0} className="h-2 bg-gray-800" indicatorClassName="bg-purple-600" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">AI Chats Completed</span>
                  <span className="text-sm">{stats.ai_chats_completed}/0</span>
                </div>
                <Progress value={0} className="h-2 bg-gray-800" indicatorClassName="bg-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Courses Section */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
            <CardDescription>Recently accessed courses</CardDescription>
          </CardHeader>
          <CardContent>
            {userCourses && userCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {userCourses.map((item) => (
                  <Link key={item.id} href={`/courses/${item.course_id}`}>
                    <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition cursor-pointer">
                      <h3 className="font-medium mb-1">{item.courses.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{item.courses.faculty}</p>
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{item.progress_percentage}%</span>
                        </div>
                        <Progress
                          value={item.progress_percentage}
                          className="h-1 bg-gray-700"
                          indicatorClassName="bg-purple-600"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Last accessed: {new Date(item.last_accessed).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-gray-400 mb-4">You haven't enrolled in any courses yet.</p>
                <Button asChild>
                  <Link href="/library">Browse Courses</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
