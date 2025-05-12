import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { headers } from "next/headers"

export async function createClient() {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const baseUrl = `${protocol}://${host}`

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
        async set(name, value, options) {
          await fetch(`${baseUrl}/api/auth/cookie`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, value, options }),
          })
        },
        async remove(name, options) {
          await fetch(`${baseUrl}/api/auth/cookie`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, options }),
          })
        },
      },
    }
  )
}
