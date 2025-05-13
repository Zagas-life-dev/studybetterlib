"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useNotification } from "@/components/notification-provider"
import Link from "next/link"

interface ProfileData {
  id: string
  full_name: string
  avatar_url?: string
  email: string
}

interface ProfileClientProps {
  initialProfile: ProfileData
  cartCount: number
}

export default function ProfileClient({ initialProfile, cartCount }: ProfileClientProps) {
  const [profile, setProfile] = useState<ProfileData>(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [lastPasswordResetAttempt, setLastPasswordResetAttempt] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { showNotification } = useNotification()
  
  const firstName = profile.full_name.split(" ")[0]

  // Load last password reset attempt timestamp from localStorage
  useEffect(() => {
    const storedTimestamp = localStorage.getItem("passwordResetLastAttempt")
    if (storedTimestamp) {
      setLastPasswordResetAttempt(parseInt(storedTimestamp))
    }
  }, [])

  const handleProfileUpdate = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name
        })
        .eq('id', profile.id)

      if (error) throw error
      
      showNotification({
        title: "Profile Updated",
        message: "Your profile information has been updated successfully.",
        type: "success"
      })
      
      setIsEditing(false)
    } catch (error: any) {
      showNotification({
        title: "Update Failed",
        message: error.message || "Failed to update profile.",
        type: "error"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    // Check if we need to enforce a cooldown period (60 seconds)
    const now = Date.now()
    if (lastPasswordResetAttempt && (now - lastPasswordResetAttempt < 60000)) {
      const remainingSeconds = Math.ceil((60000 - (now - lastPasswordResetAttempt)) / 1000)
      showNotification({
        title: "Please wait",
        message: `You can request another reset email in ${remainingSeconds} seconds.`,
        type: "info"
      })
      setIsPasswordDialogOpen(false)
      return
    }
    
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        // Special handling for rate limit errors
        if (error.message?.toLowerCase().includes('rate limit') || 
            error.name === 'AuthApiError' && error.message?.includes('email rate limit')) {
          throw new Error("Email rate limit reached. Please try again later.")
        }
        throw error
      }
      
      // Update the last attempt timestamp
      const timestamp = Date.now()
      setLastPasswordResetAttempt(timestamp)
      localStorage.setItem("passwordResetLastAttempt", String(timestamp))
      localStorage.setItem("passwordResetEmail", profile.email)
      
      showNotification({
        title: "Password Reset Email Sent",
        message: "Check your email for a link to reset your password.",
        type: "success"
      })
      
      setIsPasswordDialogOpen(false)
    } catch (error: any) {
      console.error("Reset password error:", error)
      
      // Check for rate limiting error
      if (error.message?.toLowerCase().includes('rate limit')) {
        showNotification({
          title: "Rate limit reached",
          message: "Please wait a few minutes before trying again.",
          type: "error"
        })
      } else {
        showNotification({
          title: "Reset Failed",
          message: error.message || "Failed to send password reset email.",
          type: "error"
        })
      }
      setIsPasswordDialogOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsLoading(true)
    try {
      // First delete the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id)
      
      if (profileError) throw profileError
      
      // Then delete the user's auth account using the client
      const { error } = await supabase.rpc('delete_user')
      
      if (error) throw error
      
      showNotification({
        title: "Account Deleted",
        message: "Your account has been permanently deleted.",
        type: "info"
      })
      
      // Sign out and redirect to home page
      await supabase.auth.signOut()
      router.push('/')
    } catch (error: any) {
      showNotification({
        title: "Deletion Failed",
        message: error.message || "Failed to delete account. Please contact support.",
        type: "error"
      })
      setIsDeleteDialogOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate if user is in cooldown period
  const isInCooldown = lastPasswordResetAttempt && (Date.now() - lastPasswordResetAttempt < 60000)
  const cooldownRemaining = lastPasswordResetAttempt ? 
    Math.ceil((60000 - (Date.now() - lastPasswordResetAttempt)) / 1000) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and all data associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount} 
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      

      <div className="md:col-span-1">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Avatar className="h-32 w-32 mb-6">
              <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name || ""} />
              <AvatarFallback className="bg-purple-700 text-3xl">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
            <p className="text-gray-400 mb-6">{profile.email}</p>
            
            <Button 
              variant={isEditing ? "default" : "outline"} 
              className="w-full"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Cancel Edit" : "Edit Profile"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              /* Editing mode */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                    <Input 
                      value={profile.full_name} 
                      onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                    <div className="bg-gray-800 p-3 rounded-md">{profile.email}</div>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button onClick={handleProfileUpdate} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </>
            ) : (
              /* View mode */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                    <div className="bg-gray-800 p-3 rounded-md">{profile.full_name || "Not set"}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                    <div className="bg-gray-800 p-3 rounded-md">{profile.email}</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
             
              <div className="flex gap-3">

                <form action="/api/auth/signout" method="post">
                  <Button
                    type="submit"
                    variant="outline"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-800">
              <h3 className="text-lg font-medium mb-3">Danger Zone</h3>
              <Button 
                variant="destructive" 
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}