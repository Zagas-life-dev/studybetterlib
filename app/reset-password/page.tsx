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

  // Check if we have a valid hash in the URL and extract user info
  useEffect(() => {
    const checkHashAndGetUserInfo = async () => {
      try {
        // First check if we have a stored email from the forgot-password page
        const storedEmail = localStorage.getItem("passwordResetEmail")
        
        // Get hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')
        
        // Validate token presence
        if (!accessToken || type !== 'recovery') {
          throw new Error("Invalid or missing token")
        }
        
        // Set Supabase session
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: '',
        })
        
        // Get user data
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError || !userData.user) {
          throw new Error("Could not retrieve user information")
        }
        
        // Set the email
        setUserEmail(userData.user.email)
        setTokenValid(true)
        
        // Save the email to localStorage as backup
        if (userData.user.email) {
          localStorage.setItem("passwordResetEmail", userData.user.email)
        }
      } catch (error) {
        console.error("Token validation error:", error)
        setTokenValid(false)
        
        // Try to use stored email as fallback
        const storedEmail = localStorage.getItem("passwordResetEmail")
        if (storedEmail) {
          setUserEmail(storedEmail)
        }
        
        showNotification({
          title: "Invalid or expired link",
          message: "This password reset link is invalid or has expired. Please request a new one.",
          type: "error"
        })
        
        // Redirect to forgot password page after a short delay
        setTimeout(() => {
          router.push('/forgot-password')
        }, 3000)
      }
    }
    
    checkHashAndGetUserInfo()
  }, [router, showNotification, supabase.auth])

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
      // If we have a valid token, use the updateUser method
      if (tokenValid) {
        const { error } = await supabase.auth.updateUser({ 
          password: password 
        });

        if (error) {
          throw error;
        }
      } else if (userEmail) {
        // Fallback if token is expired but we have the email - force password reset
        // Note: This typically requires admin privileges and might not work with default permissions
        showNotification({
          title: "Session Expired",
          message: "Your password reset session has expired. Please request a new reset link.",
          type: "error"
        });
        
        setTimeout(() => {
          router.push('/forgot-password');
        }, 2000);
        return;
      } else {
        throw new Error("Unable to reset password without valid token or email");
      }

      // After successful reset, clear the stored email
      localStorage.removeItem("passwordResetEmail");

      // Show auto-dismiss notification
      showNotification({
        title: "Password Reset Successful",
        message: "Your password has been reset successfully. You can now log in with your new password.",
        type: "success"
      });

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error: any) {
      console.error("Update password error:", error);
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