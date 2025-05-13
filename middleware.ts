import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/middleware"

// List of public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/signup", 
  "/auth/callback",
  "/verify-email",
  "/forgot-password",
  "/reset-password",  // Add reset-password to public routes
  "/privacy",
  "/terms"
]

// Check if a path matches any of the public routes
const isPublicRoute = (path: string): boolean => {
  return publicRoutes.some(route => 
    path === route || path.startsWith(`${route}/`) || path.startsWith('/api/auth/')
  )
}

export async function middleware(request: NextRequest) {
  // Special handling for password reset codes that end up on the home page
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    // Redirect any code parameter to the reset-password page
    const code = request.nextUrl.searchParams.get("code")
    const redirectUrl = new URL('/reset-password', request.url)
    redirectUrl.searchParams.set('code', code!)
    return NextResponse.redirect(redirectUrl)
  }

  // Check for API routes that need the Mistral API key and Agent ID
  if (request.nextUrl.pathname.startsWith("/api/chat")) {
    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: "Mistral API key is not configured" }, { status: 500 })
    }
    if (!process.env.MISTRAL_AGENT_ID) {
      return NextResponse.json({ error: "Mistral Agent ID is not configured" }, { status: 500 })
    }
  }

  // For static assets and public routes, proceed without authentication check
  if (
    request.nextUrl.pathname.startsWith("/_next") || 
    request.nextUrl.pathname.includes(".") ||
    isPublicRoute(request.nextUrl.pathname)
  ) {
    return NextResponse.next()
  }

  // Authentication check for protected routes
  try {
    // Create authenticated Supabase client
    const { supabase, response } = createClient(request)
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If user is not authenticated, redirect to login
    if (!session) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Special handling for admin routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
      // Check if the user is an admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single()

      const isAdminEmail = session.user.email === "studybetter.ai@gmail.com"
      const isAdminFlag = profile?.is_admin === true

      if (!isAdminFlag && !isAdminEmail) {
        // Not an admin, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // User is authenticated, proceed with the request
    return response
  } catch (error) {
    // In case of error, redirect to login
    console.error("Auth middleware error:", error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
