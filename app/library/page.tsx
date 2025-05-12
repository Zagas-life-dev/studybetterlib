import { createClient } from "@/utils/supabase/server"
import Header from "@/components/header"
import LibraryClient from "./page-client"
import DashboardHeader from "@/components/dashboard-header" 
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic';

export default async function Library() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Fetch courses from Supabase with enhanced querying
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching courses:", error)
  }

  // If no courses are found, we still pass an empty array rather than sample data
  const coursesData = courses || []

  return (
    <div className="flex min-h-screen flex-col">
      {session ? (
              <DashboardHeader session={session} cartCount={0} />
            ) : (
              <Header session={null} />
            )}
      <LibraryClient initialCourses={coursesData} session={session} />
      <footer className="py-6 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Study Better AI. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/contact" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
