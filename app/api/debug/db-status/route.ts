import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

interface TableStatus {
  exists: boolean
  count?: number
  error: string | null
}

interface TableStatuses {
  [key: string]: TableStatus
}

interface UserProfile {
  exists: boolean
  data: any
  error: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check if essential tables exist
    const requiredTables = ["profiles", "courses", "ai_chat_sessions", "ai_chat_messages"]
    const tableStatus: TableStatuses = {}

    for (const table of requiredTables) {
      try {
        const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })

        tableStatus[table] = {
          exists: !error,
          count: count || 0,
          error: error ? error.message : null,
        }
      } catch (e) {
        tableStatus[table] = {
          exists: false,
          count: 0,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    }

    // Check if current user exists in profiles
    const {
      data: { session },
    } = await supabase.auth.getSession()
    let userProfile: UserProfile | null = null

    if (session) {
      const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

      userProfile = {
        exists: !error && !!profile,
        data: profile,
        error: error ? error.message : null,
      }
    }

    return NextResponse.json({
      tables: tableStatus,
      userProfile,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
