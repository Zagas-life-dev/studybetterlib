import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, BookOpen, Headphones, ShoppingCart } from "lucide-react"
import Link from "next/link"

export default async function CourseDetail({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Fetch course details
  const { data: course } = await supabase.from("courses").select("*").eq("id", params.id).single()

  if (!course) {
    notFound()
  }

  // Check if user has purchased this course
  let hasPurchased = false
  if (session) {
    const { data: userCourse } = await supabase
      .from("user_courses")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("course_id", params.id)
      .single()

    hasPurchased = !!userCourse
  }

  // Fetch course content if user has purchased
  let courseContent = null
  if (hasPurchased) {
    const { data: content } = await supabase.from("course_content").select("*").eq("course_id", params.id)

    courseContent = content
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header session={session} />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Link href="/library" className="hover:text-white">
                Library
              </Link>
              <span>/</span>
              <span>{course.faculty}</span>
            </div>
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1">{course.title}</h1>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-800 px-2 py-1 rounded text-sm">{course.code}</span>
                  <span className="text-gray-400">{course.faculty}</span>
                </div>
              </div>
              {!hasPurchased && (
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart - ₦{course.price.toLocaleString()}
                </Button>
              )}
            </div>
          </div>

          {course.description && (
            <div className="bg-gray-900/50 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold mb-4">Course Description</h2>
              <p className="text-gray-300">{course.description}</p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Available Formats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {course.formats.includes("summary") && (
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-6 w-6 text-purple-500" />
                    <h3 className="text-lg font-medium">Summary</h3>
                  </div>
                  <p className="text-gray-400 mb-4">Concise overview of key course concepts</p>
                  {hasPurchased ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/courses/${params.id}/summary`}>View Summary</Link>
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500">Purchase to access</p>
                  )}
                </div>
              )}

              {course.formats.includes("explanation") && (
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-6 w-6 text-purple-500" />
                    <h3 className="text-lg font-medium">Explanation</h3>
                  </div>
                  <p className="text-gray-400 mb-4">In-depth analysis of complex topics</p>
                  {hasPurchased ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/courses/${params.id}/explanation`}>View Explanation</Link>
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500">Purchase to access</p>
                  )}
                </div>
              )}

              {course.formats.includes("podcast") && (
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Headphones className="h-6 w-6 text-purple-500" />
                    <h3 className="text-lg font-medium">Podcast</h3>
                  </div>
                  <p className="text-gray-400 mb-4">Audio format for learning on the go</p>
                  {hasPurchased ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/courses/${params.id}/podcast`}>Listen to Podcast</Link>
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500">Purchase to access</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {hasPurchased && courseContent && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Course Content</h2>
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="mb-6">
                  {course.formats.includes("summary") && <TabsTrigger value="summary">Summary</TabsTrigger>}
                  {course.formats.includes("explanation") && <TabsTrigger value="explanation">Explanation</TabsTrigger>}
                  {course.formats.includes("podcast") && <TabsTrigger value="podcast">Podcast</TabsTrigger>}
                </TabsList>

                {course.formats.includes("summary") && (
                  <TabsContent value="summary" className="bg-gray-900/50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Course Summary</h3>
                    <div className="prose prose-invert max-w-none">
                      {courseContent.find((c) => c.content_type === "summary")?.content ||
                        "Summary content will be available soon."}
                    </div>
                  </TabsContent>
                )}

                {course.formats.includes("explanation") && (
                  <TabsContent value="explanation" className="bg-gray-900/50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Detailed Explanation</h3>
                    <div className="prose prose-invert max-w-none">
                      {courseContent.find((c) => c.content_type === "explanation")?.content ||
                        "Explanation content will be available soon."}
                    </div>
                  </TabsContent>
                )}

                {course.formats.includes("podcast") && (
                  <TabsContent value="podcast" className="bg-gray-900/50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Audio Podcast</h3>
                    {courseContent.find((c) => c.content_type === "podcast")?.audio_url ? (
                      <audio controls className="w-full">
                        <source
                          src={courseContent.find((c) => c.content_type === "podcast")?.audio_url}
                          type="audio/mpeg"
                        />
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <p>Audio content will be available soon.</p>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Study Better AI. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
