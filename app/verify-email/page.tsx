"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function VerifyEmail() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-purple-600/20 p-3 rounded-full">
              <Mail className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We've sent you a verification link to your email address. Please check your inbox and click the link to
            verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-gray-400">
          <p>After verification, you'll be able to sign in and access your dashboard.</p>
          <p className="mt-4 text-sm">
            Didn't receive an email? Check your spam folder or request a new verification link.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" asChild>
            <Link href="/login">Return to Login</Link>
          </Button>
          <Button variant="outline" className="w-full">
            Resend Verification Email
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
