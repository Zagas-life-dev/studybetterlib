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

    // Check if the user is an admin
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get table information
    const { data: tableInfo, error: tableError } = await supabase.rpc("get_table_info")

    if (tableError) {
      return NextResponse.json({ error: tableError.message }, { status: 500 })
    }

    return NextResponse.json({
      tables: tableInfo,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
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
