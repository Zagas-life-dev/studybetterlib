import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import AdminFeedbackClient from "./client"
import AdminLayout from "@/components/admin-layout"

export const metadata: Metadata = {
  title: "Feedback Management - Admin Dashboard",
  description: "Manage user feedback and responses",
}

export default async function AdminFeedbackPage() {
  // Get user session and verify admin role
  const cookieStore = cookies()
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect("/login?redirect=/admin/feedback")
  }
  
  // Check if user is an admin (matching the check in main admin dashboard)
  const { data: user } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("is_admin, email, role").eq("id", session.user.id).single()
  
  const isAdminEmail = user?.user?.email === "studybetter.ai@gmail.com"
  const isAdminFlag = profile?.is_admin === true
  const isAdminRole = profile?.role === "admin"
  
  // Redirect if not an admin (using same logic as main admin page)
  if (!isAdminFlag && !isAdminEmail && !isAdminRole) {
    redirect("/dashboard")
  }
  
  return (
    <AdminLayout>
      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Feedback Management</h1>
            <p className="text-muted-foreground">
              Review and respond to user feedback
            </p>
          </div>
          
          <AdminFeedbackClient />
        </div>
      </main>
    </AdminLayout>
  )
}