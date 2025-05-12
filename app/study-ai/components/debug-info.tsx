"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function DebugInfo() {
  const searchParams = useSearchParams()
  const chatId = searchParams.get("id")

  useEffect(() => {
    console.log("Current chat ID from URL:", chatId)
  }, [chatId])

  return (
    <div className="fixed bottom-2 right-2 bg-gray-800 text-xs text-white p-2 opacity-50 hover:opacity-100 rounded z-50">
      Debug: Chat ID = {chatId || "none"}
    </div>
  )
}