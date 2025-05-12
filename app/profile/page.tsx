import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import DashboardHeader from "@/components/dashboard-header"
import Link from "next/link"
import ProfileClient from "./profile-client"

export default async function Profile() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  // Fetch cart items count
  const { count: cartCount } = await supabase
    .from("cart_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id)

  // Get user's first name
  const fullName = profile?.full_name || session.user.email?.split("@")[0] || "User"
  const firstName = fullName.split(" ")[0]

  // Create the profile data to pass to the client component
  const profileData = {
    id: session.user.id,
    full_name: profile?.full_name || firstName,
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
    email: session.user.email || ""
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader session={session} cartCount={cartCount || 0} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" className="mr-2">
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>

        {/* Pass the profile data to our client component */}
        <ProfileClient initialProfile={profileData} cartCount={cartCount || 0} />
      </main>
    </div>
  )
}
