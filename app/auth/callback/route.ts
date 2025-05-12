import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Auth callback error:", error)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }
    
    if (data?.user) {
      // Ensure the user's profile exists
      const { data: userData } = await supabase.auth.getUser()
      
      if (userData?.user) {
        // Check if profile exists
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .single()
        
        // If profile doesn't exist or there was an error, create it
        if (!existingProfile || profileError) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userData.user.id,
              email: userData.user.email,
              full_name: userData.user.user_metadata.full_name || 'User',
              avatar_url: userData.user.user_metadata.avatar_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            
          if (insertError) {
            console.error('Error creating profile:', insertError)
            // Continue even if profile creation fails - we'll handle this later
          }
        }
      }
    }

    // Redirect to the specified next page or dashboard
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // If no code is provided, redirect to the login page
  return NextResponse.redirect(new URL("/login", requestUrl.origin))
}
