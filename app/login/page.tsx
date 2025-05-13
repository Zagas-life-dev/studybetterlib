"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Book, MessageSquare, Headphones, Globe } from "lucide-react"
import { useNotification } from "@/components/notification-provider"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const router = useRouter()
  const { toast } = useToast()
  const { showNotification } = useNotification()
  const supabase = createClient()
  
  // Check environment and URL parameters
  useEffect(() => {
    // Check Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
      showNotification({
        title: "Configuration Error",
        message: "The application is not properly configured. Please contact support.",
        type: "error"
      });
    }
    
    // Check URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const isPending = searchParams.get("verification") === "pending";
    const redirectedFrom = searchParams.get("redirectedFrom");
    
    // Check hash for error parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');
    
    // Handle verification pending
    if (isPending) {
      showNotification({
        title: "Verify Your Email",
        message: "Please check your email inbox to verify your account before logging in.",
        type: "info"
      });
    }
    
    // Handle reset password link expired case
    if (errorCode === 'otp_expired' || 
        (errorDescription?.includes('expired') && redirectedFrom?.includes('reset-password'))) {
      console.log("Detected expired password reset token");
      
      showNotification({
        title: "Password Reset Link Expired",
        message: "Your password reset link has expired. Please request a new one.",
        type: "error"
      });
      
      // Clean URL to remove error parameters
      window.history.replaceState({}, document.title, '/login');
      
      // Store that we need to show the forgot password link prominently
      localStorage.setItem("showResetPrompt", "true");
    }
    
    // Show a prompt after a short delay if we have a showResetPrompt flag
    const hasResetPrompt = localStorage.getItem("showResetPrompt") === "true";
    if (hasResetPrompt) {
      setTimeout(() => {
        showNotification({
          title: "Need to reset your password?",
          message: "Click 'Forgot password?' below to request a new reset link.",
          type: "info"
        });
        localStorage.removeItem("showResetPrompt");
      }, 1000);
    }
    
  }, [showNotification]);

  // Validate the form
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      errors.password = "Password is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      toast({
        title: "Form validation failed",
        description: "Please check the form for errors.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      console.log("Attempting login with:", { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Supabase login error:", error);
        throw error;
      }

      console.log("Login successful:", data);

      // Show auto-dismiss notification
      showNotification({
        title: "Login Successful!",
        message: "Welcome back to Study Better!",
        type: "success"
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
        
        // Force a hard navigation to ensure all server components are refreshed
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      }, 500);
    } catch (error: any) {
      console.error("Error during login:", error);
      showNotification({
        title: "Login Failed",
        message: error.message || "An error occurred during login.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-1/2 bg-[#4c2a9c] p-12 flex-col justify-center hidden md:flex">
        <h1 className="text-4xl font-bold mb-4">Study Better with AI-Powered Learning</h1>
        <p className="text-gray-300 mb-8">Access comprehensive course materials tailored for your learning needs.</p>

        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="text-purple-300">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Comprehensive Summaries</h3>
              <p className="text-sm text-gray-400">Get concise overviews of key course concepts</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-purple-300">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">AI Chat Assistant</h3>
              <p className="text-sm text-gray-400">Get personalized help with difficult concepts</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-purple-300">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Audio Learning</h3>
              <p className="text-sm text-gray-400">Listen to your course materials on the go</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-purple-300">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">In-Depth Explanations</h3>
              <p className="text-sm text-gray-400">Deep dive into complex course topics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-black">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-gray-400 mt-2">Sign in to your account or create a new one</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full bg-black text-white rounded-none rounded-l-md">
                Login
              </Button>
            </Link>
            <Link href="/signup" className="w-full">
              <Button variant="outline" className="w-full rounded-none rounded-r-md">
                Register
              </Button>
            </Link>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your.name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full bg-black border-gray-700 ${formErrors.email ? 'border-red-500' : ''}`}
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full bg-black border-gray-700 ${formErrors.password ? 'border-red-500' : ''}`}
              />
              {formErrors.password && (
                <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-[#7c3aed] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-2 rounded"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-[#7c3aed] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#7c3aed] hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
