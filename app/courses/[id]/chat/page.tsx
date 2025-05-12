import { createClient } from "@/utils/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import DashboardHeader from "@/components/dashboard-header"
import { MessageSquare, ArrowLeft } from "lucide-react"
import { createChatSession } from "@/app/actions/chat-new"
import Link from "next/link"

export default async function CourseChat({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch course details
  const { data: course, error: courseError } = await supabase.from("courses").select("*").eq("id", params.id).single()

  if (courseError || !course) {
    notFound()
  }

  // Fetch chat sessions for this course
  const { data: chatSessions } = await supabase
    .from("ai_chat_sessions")
    .select("id, title, updated_at")
    .eq("user_id", session.user.id)
    .eq("course_id", params.id)
    .order("updated_at", { ascending: false })

  // Fetch cart items count
  const { count: cartCount } = await supabase
    .from("cart_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id)

  // Server action to create a new course-specific chat session
  const handleCreateCourseChat = async () => {
    "use server"

    const result = await createChatSession(`Chat about ${course.title}`, params.id)

    if (result.success && result.sessionId) {
      redirect(`/chat/${result.sessionId}`)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader session={session} cartCount={cartCount || 0} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" asChild>
            <Link href={`/courses/${params.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Course Chat Assistant</h1>
        </div>

        <div className="mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-1">{course.title}</h2>
              <p className="text-gray-400">
                {course.code} • {course.faculty}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="bg-gray-900 border-gray-800 h-[calc(100vh-300px)]">
              <div className="p-4">
                <form action={handleCreateCourseChat}>
                  <Button type="submit" className="w-full mb-4">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Course Chat
                  </Button>
                </form>
              </div>

              <div className="px-4 pb-4">
                <h3 className="font-medium mb-2">Course Chat History</h3>
                {chatSessions && chatSessions.length > 0 ? (
                  <div className="space-y-1">
                    {chatSessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/chat/${session.id}`}
                        className="flex items-center p-3 rounded-md hover:bg-gray-800 transition-colors"
                      >
                        <MessageSquare className="h-5 w-5 mr-3 text-purple-500" />
                        <div>
                          <p className="font-medium">{session.title}</p>
                          <p className="text-xs text-gray-400">{new Date(session.updated_at).toLocaleDateString()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400">No course chat history yet</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="bg-gray-900 border-gray-800 h-[calc(100vh-300px)] flex flex-col">
              <CardContent className="flex-grow flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="h-16 w-16 text-purple-500 mb-4" />
                <h3 className="text-xl font-medium mb-2">Course-Specific AI Assistant</h3>
                <p className="text-gray-400 mb-6 max-w-md">
                  Ask questions about {course.title} and get personalized help with course concepts.
                </p>
                <form action={handleCreateCourseChat}>
                  <Button size="lg" type="submit">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Course Chat
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
