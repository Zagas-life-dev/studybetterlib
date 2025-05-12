import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

interface TableResult {
  exists: boolean;
  count?: number;
  error: string | null;
}

interface TableResults {
  [key: string]: TableResult;
}

interface Policy {
  table_name: string;
  [key: string]: any;
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if the tables exist
    const tables = ["ai_chat_sessions", "ai_chat_messages", "profiles", "courses"]
    const results: TableResults = {}

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase.from(table).select("*", { count: "exact", head: true })

        results[table] = {
          exists: !error,
          count: count ?? undefined,
          error: error ? error.message : null,
        }
      } catch (e) {
        results[table] = {
          exists: false,
          count: undefined,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    }

    // Check RLS policies - get all policies and filter in the response
    const { data: allPolicies, error: policiesError } = await supabase.rpc("get_policies")

    // Filter policies to only include chat-related ones
    const chatPolicies = (allPolicies as Policy[] | null)?.filter((p: Policy) => p.table_name.toLowerCase().includes("ai_chat")) || []

    return NextResponse.json({
      tables: results,
      policies: policiesError ? { error: policiesError.message } : chatPolicies,
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
