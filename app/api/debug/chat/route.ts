import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Test creating a chat session directly
    const { data, error } = await supabase
      .from("ai_chat_sessions")
      .insert({
        user_id: session.user.id,
        title: "Debug Chat",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Debug chat created successfully",
      chatSession: data,
      user: session.user,
    })
  } catch (error) {
    return NextResponse.json({ error: "Unexpected error", details: error }, { status: 500 })
  }
}
