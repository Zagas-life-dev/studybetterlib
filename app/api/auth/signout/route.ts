import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

// Define the POST handler for the API route
export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL("/", request.url))
}

// Add a GET handler to handle direct visits to this route
export async function GET(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL("/", request.url))
}
