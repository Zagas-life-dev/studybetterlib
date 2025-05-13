"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useNotification } from "@/components/notification-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Shield } from "lucide-react"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { showNotification } = useNotification()

  // Extract email and code from URL or storage
  useEffect(() => {
    // Check for code parameter in URL which should come from password reset flow
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const emailParam = urlParams.get('email')
    
    if (code) {
      console.log("Found reset code in URL parameters, will use for authentication")
      
      // Store the code temporarily for the API call
      sessionStorage.setItem("resetPasswordCode", code)
    }
    
    if (emailParam) {
      console.log("Found email in URL parameters:", emailParam)
      // Store the email for later use
      localStorage.setItem("passwordResetEmail", emailParam)
      sessionStorage.setItem("passwordResetEmail", btoa(emailParam))
      
      setUserEmail(emailParam)
      
      // Clean email from URL but keep code parameter for auth
      const url = new URL(window.location.href)
      url.searchParams.delete('email')
      window.history.replaceState({}, document.title, url.toString())
    } else {
      // Try to get email from storage as fallback
      const emailFromLocal = localStorage.getItem("passwordResetEmail")
      const encodedEmail = sessionStorage.getItem("passwordResetEmail")
      
      let emailFromSession = null
      if (encodedEmail) {
        try {
          emailFromSession = atob(encodedEmail)
        } catch (e) {
          // If not properly encoded, use as-is
          emailFromSession = encodedEmail
        }
      }
      
      const storedEmail = emailFromLocal || emailFromSession
      if (storedEmail) {
        console.log("Using stored email:", storedEmail)
        setUserEmail(storedEmail)
      } else if (!code) {
        // If no email can be found and no code, redirect to forgot password page
        console.log("No email parameter or stored email found, and no code")
        router.push('/forgot-password')
      }
    }
  }, [router])

  // Check if we have a valid code in the URL and use it to set up the page
  useEffect(() => {
    // Set up reset page without trying to exchange code for session from client
    const checkCodeAndSetupPage = async () => {
      try {
        // Check for code and email in URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const emailParam = urlParams.get('email')
        
        // If we have a code, store it for later API call
        if (code) {
          console.log("Found code in URL, storing for later use")
          sessionStorage.setItem("resetPasswordCode", code)
        }
        
        // Try to get user data from existing session if available
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const { data: userData } = await supabase.auth.getUser()
          
          if (userData?.user?.email) {
            console.log("Found user in existing session:", userData.user.email)
            setUserEmail(userData.user.email)
            setTokenValid(true)
            
            // Save the email to localStorage as backup
            localStorage.setItem("passwordResetEmail", userData.user.email)
            return // We have what we need
          }
        } catch (sessionError) {
          console.error("Error checking existing session:", sessionError)
          // Continue to other methods
        }
        
        // Use email from URL params
        if (emailParam) {
          console.log("Using email from URL parameter:", emailParam)
          setUserEmail(emailParam)
          localStorage.setItem("passwordResetEmail", emailParam)
          
          // Don't need to keep this in the URL
          const url = new URL(window.location.href)
          url.searchParams.delete('email')
          window.history.replaceState({}, document.title, url.toString())
          
          // Set token valid to unknown (null) as we'll try to use it
          setTokenValid(null)
          return
        }
        
        // Fallback to stored email
        const emailFromLocal = localStorage.getItem("passwordResetEmail")
        if (emailFromLocal) {
          console.log("Using stored email:", emailFromLocal)
          setUserEmail(emailFromLocal)
          setTokenValid(false) // We have email but not from this flow
          return
        }
        
        // No valid information found
        throw new Error("No authentication information available")
      } catch (error) {
        console.error("Setup error:", error)
        setTokenValid(false)
        
        // Only show notification if we have no email information at all
        if (!userEmail && !localStorage.getItem("passwordResetEmail")) {
          showNotification({
            title: "Reset Link Invalid",
            message: "This password reset link appears to be invalid or has expired. Please request a new one.",
            type: "error"
          })
          
          // Redirect to forgot password page after a short delay
          setTimeout(() => {
            router.push('/forgot-password')
          }, 3000)
        }
      }
    }
    
    checkCodeAndSetupPage()
  }, [router, showNotification, supabase.auth, userEmail])

  // Evaluate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(null)
      return
    }
    
    const hasMinLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password)
    
    const passedCriteria = [hasMinLength, hasUppercase, hasLowercase, hasNumbers, hasSpecialChar].filter(Boolean).length
    
    if (passedCriteria <= 2) setPasswordStrength('weak')
    else if (passedCriteria <= 4) setPasswordStrength('medium')
    else setPasswordStrength('strong')
    
  }, [password])

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/\d/.test(password)) {
      errors.password = "Password must contain at least one number";
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Extract token/code from URL or session storage
      const extractToken = () => {
        // Check URL query params (?code=...)
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        if (code) return code;
        
        // Check URL hash (#access_token=...)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const token = hashParams.get('access_token');
          if (token) return token;
        }
        
        // Check session storage
        return sessionStorage.getItem("resetPasswordCode");
      };
      
      const token = extractToken();
      
      // Call our server-side API
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          password: password,
          token: token
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to reset password');
      }

      // After successful reset, clear stored data
      localStorage.removeItem("passwordResetEmail");
      localStorage.removeItem("passwordResetTimestamp");
      sessionStorage.removeItem("passwordResetEmail");
      sessionStorage.removeItem("resetPasswordCode");

      // Show success notification
      showNotification({
        title: "Password Reset Successful",
        message: result.message || "Your password has been reset successfully. You can now log in with your new password.",
        type: "success"
      });

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      showNotification({
        title: "Error",
        message: error.message || "An error occurred while resetting your password.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 'weak') return 'text-red-500';
    if (passwordStrength === 'medium') return 'text-yellow-500';
    if (passwordStrength === 'strong') return 'text-green-500';
    return '';
  };

  const renderPasswordRequirements = () => (
    <div className="mt-2 text-sm text-gray-400 space-y-1">
      <p>Password requirements:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li className={password.length >= 8 ? 'text-green-500' : ''}>At least 8 characters</li>
        <li className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>At least one uppercase letter</li>
        <li className={/[a-z]/.test(password) ? 'text-green-500' : ''}>At least one lowercase letter</li>
        <li className={/\d/.test(password) ? 'text-green-500' : ''}>At least one number</li>
        <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-500' : ''}>At least one special character</li>
      </ul>
    </div>
  );

  if (tokenValid === false && !userEmail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
        <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-lg">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invalid or expired password reset link. Redirecting to password reset request page...
            </AlertDescription>
          </Alert>
          <div className="text-center mt-4">
            <Link href="/forgot-password" className="text-sm text-[#7c3aed] hover:underline">
              Request New Password Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create New Password</h1>
          {userEmail && (
            <p className="mt-2 text-sm text-gray-300">
              Setting new password for: <span className="font-medium text-[#a78bfa]">{userEmail}</span>
            </p>
          )}
          <p className="mt-2 text-sm text-gray-400">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              New Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`mt-1 bg-black border-gray-700 ${formErrors.password ? 'border-red-500' : ''}`}
              />
              {passwordStrength && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${getPasswordStrengthColor()}`}>
                  {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </span>
              )}
            </div>
            {formErrors.password && (
              <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
            )}
            {password && renderPasswordRequirements()}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`mt-1 bg-black border-gray-700 ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {formErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="text-green-500 text-xs mt-1 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" /> Passwords match
              </p>
            )}
          </div>

          {tokenValid === false && userEmail && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your reset link has expired, but we'll try to reset the password for {userEmail}.
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : (
              <>
                <Shield className="h-4 w-4" /> Reset Password
              </>
            )}
          </Button>
        </form>

        <div className="text-center mt-4">
          <Link href="/login" className="text-sm text-[#7c3aed] hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}