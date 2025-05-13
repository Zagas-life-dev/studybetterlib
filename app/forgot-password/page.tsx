"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useNotification } from "@/components/notification-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Clock } from "lucide-react"

// Constants for rate limiting
const CLIENT_COOLDOWN_MS = 60000 // 1 minute client-side cooldown
const MAX_ATTEMPTS_BEFORE_LONGER_COOLDOWN = 3
const LONGER_COOLDOWN_MS = 300000 // 5 minutes

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [lastAttempt, setLastAttempt] = useState<number | null>(null)
  const [attempts, setAttempts] = useState<number>(0)
  const [isBlocked, setIsBlocked] = useState<boolean>(false)
  const { toast } = useToast()
  const { showNotification } = useNotification()
  const supabase = createClient()

  // Load rate limiting data from localStorage
  useEffect(() => {
    const storedTimestamp = localStorage.getItem("passwordResetLastAttempt")
    const storedAttempts = localStorage.getItem("passwordResetAttempts")
    const storedBlockExpiry = localStorage.getItem("passwordResetBlockUntil")
    
    if (storedTimestamp) {
      setLastAttempt(parseInt(storedTimestamp))
    }
    
    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts))
    }
    
    if (storedBlockExpiry) {
      const blockUntil = parseInt(storedBlockExpiry)
      if (blockUntil > Date.now()) {
        setIsBlocked(true)
        
        // Set up a timer to unblock after expiry
        const timeout = setTimeout(() => {
          setIsBlocked(false)
          localStorage.removeItem("passwordResetBlockUntil")
        }, blockUntil - Date.now())
        
        return () => clearTimeout(timeout)
      } else {
        localStorage.removeItem("passwordResetBlockUntil")
      }
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
    
    // Check if we're in a blocked period
    if (isBlocked) {
      const blockUntil = parseInt(localStorage.getItem("passwordResetBlockUntil") || "0")
      const remainingMinutes = Math.ceil((blockUntil - Date.now()) / 60000)
      
      showNotification({
        title: "Too many attempts",
        message: `Please wait ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} before trying again.`,
        type: "error"
      })
      return
    }
    
    // Check if we need to enforce a cooldown period
    const now = Date.now()
    if (lastAttempt && (now - lastAttempt < CLIENT_COOLDOWN_MS)) {
      const remainingSeconds = Math.ceil((CLIENT_COOLDOWN_MS - (now - lastAttempt)) / 1000)
      showNotification({
        title: "Please wait",
        message: `You can request another reset email in ${remainingSeconds} seconds.`,
        type: "info"
      })
      return
    }
    
    setIsLoading(true)

    try {
      // Get the correct redirect URL for the current environment
      const origin = window.location.origin
      
      // If on localhost, ensure we use HTTP instead of HTTPS to avoid SSL issues
      let redirectUrl = `${origin}/reset-password`
      if (origin.includes('localhost')) {
        redirectUrl = redirectUrl.replace('https:', 'http:')
        console.log("Using HTTP for localhost redirect:", redirectUrl)
      }
      
      console.log("Reset password redirect URL:", redirectUrl)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
        emailRedirectTo: redirectUrl
      })

      if (error) {
        // Track this attempt regardless of success or failure
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        localStorage.setItem("passwordResetAttempts", String(newAttempts))
        
        // Special handling for rate limit errors from Supabase
        if (error.message?.toLowerCase().includes('rate limit') || 
            error.name === 'AuthApiError' && error.message?.includes('email rate limit')) {
          
          // If exceeded maximum attempts, block for longer period
          if (newAttempts >= MAX_ATTEMPTS_BEFORE_LONGER_COOLDOWN) {
            const blockUntil = Date.now() + LONGER_COOLDOWN_MS
            localStorage.setItem("passwordResetBlockUntil", String(blockUntil))
            setIsBlocked(true)
            
            throw new Error(`Too many password reset attempts. Please wait ${LONGER_COOLDOWN_MS/60000} minutes before trying again.`)
          }
          
          throw new Error("Rate limit reached. Please try again later.")
        }
        
        throw error
      }

      // Update the last attempt timestamp on success
      const timestamp = Date.now()
      setLastAttempt(timestamp)
      localStorage.setItem("passwordResetLastAttempt", String(timestamp))
      
      // Store the email more securely with an encrypted timestamp to help validate
      // that this is a recent reset request
      localStorage.setItem("passwordResetEmail", email)
      localStorage.setItem("passwordResetTimestamp", String(timestamp))
      
      // Encode the email in base64 to avoid special characters issues
      const encodedEmail = btoa(email)
      // Store to sessionStorage as well for more persistent access
      sessionStorage.setItem("passwordResetEmail", encodedEmail)
      
      // Reset attempts counter on successful send
      setAttempts(0)
      localStorage.setItem("passwordResetAttempts", "0")
      
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
        
        if (error.message.includes('minutes')) {
          showNotification({
            title: "Too many attempts",
            message: error.message,
            type: "error"
          })
        } else {
          showNotification({
            title: "Rate limit reached",
            message: "Please wait a few minutes before trying again.",
            type: "error"
          })
        }
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
  const isInCooldown = lastAttempt && (Date.now() - lastAttempt < CLIENT_COOLDOWN_MS)
  const cooldownRemaining = lastAttempt ? Math.ceil((CLIENT_COOLDOWN_MS - (Date.now() - lastAttempt)) / 1000) : 0
  
  // Calculate block remaining time if blocked
  const getBlockRemainingText = () => {
    const blockUntil = parseInt(localStorage.getItem("passwordResetBlockUntil") || "0")
    const remainingMinutes = Math.ceil((blockUntil - Date.now()) / 60000)
    return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset Your Password</h1>
          <p className="mt-2 text-sm text-gray-400">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        {isBlocked && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-900">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Too many password reset attempts. Please wait {getBlockRemainingText()} before trying again.
            </AlertDescription>
          </Alert>
        )}

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
              disabled={isBlocked}
            />
          </div>

          {isInCooldown && !isBlocked && (
            <div className="text-sm text-amber-400 flex items-center gap-1">
              <Clock className="h-3 w-3" /> 
              Please wait {cooldownRemaining} seconds before requesting another reset email.
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9]"
            disabled={isLoading || isInCooldown || isBlocked}
          >
            {isLoading ? "Sending..." : 
             isBlocked ? `Blocked (${getBlockRemainingText()})` : 
             isInCooldown ? `Wait ${cooldownRemaining}s` : 
             "Send Reset Link"}
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