"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useNotification } from "@/components/notification-provider"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [lastAttempt, setLastAttempt] = useState<number | null>(null)
  const { toast } = useToast()
  const { showNotification } = useNotification()
  const supabase = createClient()

  // Load last attempt timestamp from localStorage
  useEffect(() => {
    const storedTimestamp = localStorage.getItem("passwordResetLastAttempt")
    if (storedTimestamp) {
      setLastAttempt(parseInt(storedTimestamp))
    }
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      showNotification({
        title: "Invalid email",
        message: "Please enter a valid email address.",
        type: "error"
      })
      return
    }
    
    // Check if we need to enforce a cooldown period (60 seconds)
    const now = Date.now()
    if (lastAttempt && (now - lastAttempt < 60000)) {
      const remainingSeconds = Math.ceil((60000 - (now - lastAttempt)) / 1000)
      showNotification({
        title: "Please wait",
        message: `You can request another reset email in ${remainingSeconds} seconds.`,
        type: "info"
      })
      return
    }
    
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        // Special handling for rate limit errors
        if (error.message?.toLowerCase().includes('rate limit') || 
            error.name === 'AuthApiError' && error.message?.includes('email rate limit')) {
          
          // Store the failed attempt in browser storage
          localStorage.setItem("passwordResetAttempts", 
            String(parseInt(localStorage.getItem("passwordResetAttempts") || "0") + 1))
          
          throw new Error("Too many password reset attempts. Please try again later or contact support if you're having trouble accessing your account.")
        }
        throw error
      }

      // Update the last attempt timestamp
      const timestamp = Date.now()
      setLastAttempt(timestamp)
      localStorage.setItem("passwordResetLastAttempt", String(timestamp))
      localStorage.setItem("passwordResetEmail", email)
      
      // Show auto-dismiss notification
      showNotification({
        title: "Password Reset Email Sent",
        message: "If an account exists with this email, you will receive a password reset link shortly. Please check your inbox and spam folder.",
        type: "success"
      })
    } catch (error: any) {
      console.error("Reset password error:", error)
      
      // Check for rate limiting error
      if (error.message?.toLowerCase().includes('rate limit') || 
          error.message?.includes('too many password reset attempts')) {
        showNotification({
          title: "Rate limit reached",
          message: "Please wait a few minutes before trying again.",
          type: "error"
        })
      } else {
        showNotification({
          title: "Error",
          message: error.message || "An error occurred. Please try again.",
          type: "error"
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate if user is in cooldown period
  const isInCooldown = lastAttempt && (Date.now() - lastAttempt < 60000)
  const cooldownRemaining = lastAttempt ? Math.ceil((60000 - (Date.now() - lastAttempt)) / 1000) : 0

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset Your Password</h1>
          <p className="mt-2 text-sm text-gray-400">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 bg-black border-gray-700"
            />
          </div>

          {isInCooldown && (
            <div className="text-sm text-amber-400">
              Please wait {cooldownRemaining} seconds before requesting another reset email.
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9]"
            disabled={isLoading || isInCooldown}
          >
            {isLoading ? "Sending..." : isInCooldown ? `Wait ${cooldownRemaining}s` : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center mt-4">
          <Link href="/login" className="text-sm text-[#7c3aed] hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}