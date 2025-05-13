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
  const [isHandlingDirectCode, setIsHandlingDirectCode] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { showNotification } = useNotification()
  
  // First, handle the case where we're on the Supabase domain
  useEffect(() => {
    // Check if we're on the Supabase domain with a code
    const isSupabaseDomain = window.location.hostname.includes('supabase.co');
    if (isSupabaseDomain) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        console.log("Detected Supabase hosted domain with code. Redirecting to application...");
        
        // Get the part after supabase.co/ which should be your domain
        const pathParts = window.location.pathname.split('/');
        let targetDomain = pathParts[1] || 'studybetterai.com'; // Default fallback
        
        // Remove any trailing elements like "index.html"
        if (targetDomain.includes('.')) {
          targetDomain = targetDomain.split('.')[0] + '.com';
        }
        
        // Check if this is likely a localhost environment
        let protocol = 'https';
        if (targetDomain.includes('localhost') || targetDomain.includes('127.0.0.1')) {
          protocol = 'http';
        }
        
        // Construct redirect URL to your actual domain
        const redirectUrl = `${protocol}://${targetDomain}/reset-password?direct_code=${code}`;
        console.log(`Redirecting to: ${redirectUrl}`);
        
        // Redirect to your actual domain with the code
        window.location.href = redirectUrl;
        return;
      }
    }
  }, []);
  
  // Handle direct code from URL (after redirect from Supabase domain)
  useEffect(() => {
    const handleDirectCode = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const directCode = urlParams.get('direct_code');
      
      if (directCode && !isHandlingDirectCode) {
        setIsHandlingDirectCode(true);
        console.log("Found direct_code parameter. Attempting to exchange for session...");
        
        try {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(directCode);
          
          if (error) {
            console.error("Error exchanging code for session:", error);
            throw error;
          }
          
          if (data && data.session) {
            console.log("Successfully obtained session from code");
            
            // Get user data from the session
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
              console.error("Error getting user:", userError);
              throw userError;
            }
            
            console.log("Authentication successful");
            setUserEmail(userData.user?.email || null);
            setTokenValid(true);
            
            // Clean URL by removing the direct_code
            const url = new URL(window.location.href);
            url.searchParams.delete('direct_code');
            window.history.replaceState({}, document.title, url.toString());
          }
        } catch (error) {
          console.error("Error handling direct code:", error);
          setTokenValid(false);
          showNotification({
            title: "Authentication Error",
            message: "Failed to authenticate with the provided code. Please request a new password reset link.",
            type: "error"
          });
        }
      }
    };
    
    handleDirectCode();
  }, [supabase.auth, showNotification]);

  // Standard URL token extraction for normal password reset links
  useEffect(() => {
    // Skip if we already handled a direct code
    if (isHandlingDirectCode) return;
    
    const checkHashAndGetUserInfo = async () => {
      try {
        // First check if we have a stored email from the forgot-password page
        const storedEmail = localStorage.getItem("passwordResetEmail")
        
        // Add logging for debugging
        console.log("Reset password URL:", window.location.href);
        console.log("Hash present:", !!window.location.hash);
        console.log("Search params present:", !!window.location.search);
        
        // Get token from various possible locations
        let accessToken = null;
        let code = null;
        
        // Check for hash fragment first (#access_token=...)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          accessToken = hashParams.get('access_token')
          console.log("Found token in hash:", !!accessToken)
        }
        
        // If not found in hash, check query parameters (?token=...)
        if (!accessToken && window.location.search) {
          const queryParams = new URLSearchParams(window.location.search)
          accessToken = queryParams.get('token') || queryParams.get('access_token')
          
          // Also check for code parameter
          if (!accessToken) {
            code = queryParams.get('code')
            if (code) {
              console.log("Found code in query params:", !!code);
              
              // Try to exchange the code for a session
              try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                  console.error("Code exchange error:", error);
                  throw error;
                }
                
                if (data && data.session) {
                  console.log("Successfully exchanged code for session");
                  accessToken = data.session.access_token;
                }
              } catch (exchangeError) {
                console.error("Error exchanging code for session:", exchangeError);
              }
            }
          }
          
          console.log("Found token in query params:", !!accessToken)
        }
        
        // If no token, try to get session from existing auth state
        if (!accessToken) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData && sessionData.session) {
            console.log("Using existing session");
            accessToken = sessionData.session.access_token;
          }
        }
        
        // Validate token presence
        if (!accessToken) {
          console.error("No access token found");
          throw new Error("No access token found");
        }
        
        console.log("Setting session with token");
        
        // Only set session if we got token from URL (not needed if using existing session)
        if (code || window.location.hash || (window.location.search && 
            (window.location.search.includes('token=') || window.location.search.includes('access_token=')))) {
          const sessionResult = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
          });
          
          if (sessionResult.error) {
            console.error("Session error:", sessionResult.error);
            throw sessionResult.error;
          }
          
          console.log("Session set successfully");
        }
        
        // Get user data
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("User error:", userError);
          throw userError;
        }
        
        if (!userData?.user) {
          console.error("No user data returned");
          throw new Error("Could not retrieve user information");
        }
        
        console.log("User authenticated successfully:", userData.user.email);
        
        // Set the email
        setUserEmail(userData.user.email);
        setTokenValid(true);
        
        // Save the email to localStorage as backup
        if (userData.user.email) {
          localStorage.setItem("passwordResetEmail", userData.user.email);
        }
      } catch (error) {
        console.error("Token validation error:", error);
        setTokenValid(false);
        
        // Try to use stored email as fallback
        const storedEmail = localStorage.getItem("passwordResetEmail");
        if (storedEmail) {
          setUserEmail(storedEmail);
          console.log("Using stored email as fallback:", storedEmail);
        }
        
        showNotification({
          title: "Invalid or expired link",
          message: "This password reset link is invalid or has expired. Please request a new one.",
          type: "error"
        });
        
        // Redirect to forgot password page after a short delay
        setTimeout(() => {
          router.push('/forgot-password');
        }, 3000);
      }
    }
    
    checkHashAndGetUserInfo();
  }, [router, showNotification, supabase.auth, isHandlingDirectCode]);

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

  // Rest of component remains unchanged
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

  // UI helper functions
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