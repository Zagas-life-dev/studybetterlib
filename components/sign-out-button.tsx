"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import type { ButtonHTMLAttributes } from "react"
import { useNotification } from "@/components/notification-provider"
import { Loader2 } from "lucide-react"

interface SignOutButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  redirect?: string
}

export default function SignOutButton({ className, redirect = "/", ...props }: SignOutButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showNotification } = useNotification()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      // Clear any auth-related items from localStorage
      localStorage.removeItem("supabase.auth.token")
      
      // Clear client-side cache
      router.refresh()
      
      // Slight delay to ensure signout is processed
      setTimeout(() => {
        // Hard redirect to fully reset the application state
        window.location.href = redirect
      }, 300)
      
    } catch (error: any) {
      console.error("Sign out error:", error)
      setIsLoading(false)
      
      showNotification({
        title: "Error signing out",
        message: error.message || "There was a problem signing out. Please try again.",
        type: "error"
      })
    }
  }

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={handleSignOut}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
          Signing out...
        </>
      ) : (
        "Sign Out"
      )}
    </Button>
  )
}
