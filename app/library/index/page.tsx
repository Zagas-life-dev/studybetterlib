import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import CourseCard from "@/components/course-card"

export default async function LibraryIndex() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch courses from Supabase
  const { data: courses } = await supabase.from("courses").select("*").order("created_at", { ascending: false })

  // Fetch cart items count
  const { count: cartCount } = await supabase
    .from("cart_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id)

  // Sample courses if no courses are found
  const sampleCourses = [
    {
      id: "psy101",
      title: "Introduction to Psychology",
      code: "PSY101",
      faculty: "Medicine",
      price: 2000,
      formats: ["summary", "explanation"],
    },
    {
      id: "mth201",
      title: "Calculus I",
      code: "MTH201",
      faculty: "Engineering",
      price: 1600,
      formats: ["summary", "podcast"],
    },
    {
      id: "eco110",
      title: "Microeconomics",
      code: "ECO110",
      faculty: "Business",
      price: 1600,
      formats: ["summary", "explanation", "podcast"],
    },
    {
      id: "chm221",
      title: "Organic Chemistry",
      code: "CHM221",
      faculty: "Medicine",
      price: 1900,
      formats: ["summary", "explanation", "podcast"],
    },
    {
      id: "bus322",
      title: "Business Ethics",
      code: "BUS322",
      faculty: "Business",
      price: 1900,
      formats: ["summary", "explanation"],
    },
  ]

  const displayCourses = courses && courses.length > 0 ? courses : sampleCourses

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <DashboardHeader session={session} cartCount={cartCount || 0} />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Course Library</h1>
            <p className="text-gray-400">Browse available courses and learning materials</p>
          </div>

          <div className="bg-gray-900/50 p-6 rounded-lg mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input placeholder="Search courses..." className="pl-10" />
              </div>
              <div className="flex gap-4">
                <Select defaultValue="all-formats">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Formats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-formats">All Formats</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="explanation">Explanation</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="all-faculties">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Faculties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-faculties">All Faculties</SelectItem>
                    <SelectItem value="medicine">Medicine</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
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
