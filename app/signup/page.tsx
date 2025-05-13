"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Book, MessageSquare, Headphones, Globe } from "lucide-react"
import { useNotification } from "@/components/notification-provider"

export default function SignUp() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const router = useRouter()
  const { toast } = useToast()
  const { showNotification } = useNotification()
  const supabase = createClient()

  // Validate form fields
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
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
      console.log("Starting signup process for:", email);
      
      // Try with a simplified signup call first
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `https://studybetterai.com/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        console.error("Signup error details:", error);
        
        // Show more detailed error message
        if (error.message.includes("Database error")) {
          showNotification({
            title: "Sign up failed",
            message: "There is an issue with our database configuration. Please try again later or contact support.",
            type: "error"
          });
          
          console.error("Database error during signup. The trigger on auth.users table may be causing issues.");
        } else {
          throw error;
        }
      } else {
        console.log("Signup successful, data:", data);
        
        // Show auto-dismiss notification
        showNotification({
          title: "Account Created Successfully",
          message: "Please check your email to verify your account before logging in.",
          type: "success"
        });

        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push("/login?verification=pending");
        }, 1000);
      }
    } catch (error: any) {
      console.error("Error during signup:", error);
      showNotification({
        title: "Sign up failed",
        message: error.message || "An error occurred during sign up.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side banner */}
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

      {/* Right side form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-black">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-gray-400 mt-2">Sign in to your account or create a new one</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full rounded-none rounded-l-md">
                Login
              </Button>
            </Link>
            <Link href="/signup" className="w-full">
              <Button variant="outline" className="w-full bg-black text-white rounded-none rounded-r-md">
                Register
              </Button>
            </Link>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={`w-full bg-black border-gray-700 ${formErrors.fullName ? 'border-red-500' : ''}`}
              />
              {formErrors.fullName && (
                <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>
              )}
            </div>

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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full bg-black border-gray-700 ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
              />
              {formErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-2 rounded"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500">
            By signing up, you agree to our{" "}
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
