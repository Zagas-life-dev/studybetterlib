"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminAccount } from "@/app/actions/admin"
import { useToast } from "@/components/ui/use-toast"
import { Shield, CheckCircle, AlertCircle } from "lucide-react"

export default function AdminSetup() {
  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string; userId?: string } | null>(null)
  const { toast } = useToast()

  const handleCreateAdmin = async () => {
    setIsCreating(true)
    try {
      const result = await createAdminAccount()
      setResult(result)

      if (result.success) {
        toast({
          title: "Admin account created",
          description: "The admin account has been created successfully.",
        })
      } else {
        toast({
          title: "Error creating admin account",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message || "An unexpected error occurred" })
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the admin account.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-purple-600/20 p-3 rounded-full">
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Admin Account Setup</CardTitle>
          <CardDescription className="text-center">Create the admin account for Study Better AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-md">
            <p className="text-sm font-medium mb-1">Email</p>
            <p className="text-purple-400">studybetter.ai@gmail.com</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-md">
            <p className="text-sm font-medium mb-1">Password</p>
            <p className="text-purple-400">studyAIlogin@admin.1709</p>
          </div>

          {result && (
            <div
              className={`p-4 rounded-md ${result.success ? "bg-green-900/20 border border-green-800" : "bg-red-900/20 border border-red-800"}`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{result.success ? "Success" : "Error"}</p>
                  <p className="text-sm">
                    {result.success ? `Admin account created with ID: ${result.userId}` : result.error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleCreateAdmin} disabled={isCreating || result?.success}>
            {isCreating ? "Creating..." : result?.success ? "Account Created" : "Create Admin Account"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
