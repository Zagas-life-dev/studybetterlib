import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { name, value, options } = await request.json()
    const cookieStore = await cookies()
    cookieStore.set(name, value, options)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to set cookie" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { name, options } = await request.json()
    const cookieStore = await cookies()
    cookieStore.set(name, "", { ...options, maxAge: 0 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete cookie" }, { status: 500 })
  }
}