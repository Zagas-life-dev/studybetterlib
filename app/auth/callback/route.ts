import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"
  // Check if this is a password reset flow
  const type = requestUrl.searchParams.get("type")
  
  if (code) {
    // For password reset flows, redirect directly to reset-password page with the code
    // Don't try to exchange the code here to avoid code reuse issues
    if (type === "recovery") {
      console.log("Password reset flow detected, redirecting to reset-password with code")
      
      // Get the email from the request if available
      const email = requestUrl.searchParams.get("email")
      const redirectUrl = new URL(`/reset-password`, requestUrl.origin)
      
      // Add code to the redirect URL
      redirectUrl.searchParams.set("code", code)
      
      // Add email if available
      if (email) {
        redirectUrl.searchParams.set("email", email)
      }
      
      return NextResponse.redirect(redirectUrl)
    }

    // For non-recovery flows, proceed with code exchange
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error("Auth callback error:", error)
        
        // Special handling for password reset flow - if error contains PKCE or code challenge issue
        // we should still redirect to reset-password page to let client handle it
        if ((error.message?.includes("code challenge") || 
             error.message?.includes("PKCE") ||
             error.message?.includes("flow state")) && 
            (type === "recovery" || requestUrl.searchParams.has("token_hash"))) {
          
          console.log("PKCE error for password reset, redirecting to reset page")
          
          const email = requestUrl.searchParams.get("email")
          const redirectUrl = new URL(`/reset-password`, requestUrl.origin)
          redirectUrl.searchParams.set("code", code)
          
          if (email) {
            redirectUrl.searchParams.set("email", email)
          }
          
          return NextResponse.redirect(redirectUrl)
        }
        
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
        )
      }
      
      // If this is a recovery flow, redirect to reset-password page
      if (data?.session?.user?.aud === "recovery") {
        const redirectUrl = new URL(`/reset-password`, requestUrl.origin)
        redirectUrl.searchParams.set("code", code)
        
        if (data.session.user.email) {
          redirectUrl.searchParams.set("email", data.session.user.email)
        }
        
        return NextResponse.redirect(redirectUrl)
      }
      
      // Handle regular sign-in flows
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
    } catch (error) {
      console.error("Auth callback error:", error)
      
      // For any other error, redirect to reset-password page if this appears to be a recovery flow
      if (type === "recovery") {
        const redirectUrl = new URL(`/reset-password`, requestUrl.origin)
        redirectUrl.searchParams.set("code", code)
        
        const email = requestUrl.searchParams.get("email")
        if (email) {
          redirectUrl.searchParams.set("email", email)
        }
        
        return NextResponse.redirect(redirectUrl)
      }
      
      return NextResponse.redirect(
        new URL(`/login?error=Authentication%20error`, requestUrl.origin)
      )
    }
  }

  // If no code is provided, redirect to the login page
  return NextResponse.redirect(new URL("/login", requestUrl.origin))
}
