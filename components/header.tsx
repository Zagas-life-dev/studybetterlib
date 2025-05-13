"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import type { Session } from "@supabase/supabase-js"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export default function Header({ session }: { session: Session | null }) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="py-4 border-b border-gray-800">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-purple-500 mr-6">
            <Image 
              src="/logo.png" 
              alt="Study Better AI Logo" 
              width={32} 
              height={32} 
              className="rounded-sm"
            />
            <span>Study Better AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-300 hover:text-white">
              Home
            </Link>
            <Link href="/library" className="text-gray-300 hover:text-white">
              Library
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard">
              <Button variant="ghost" className="text-gray-300 hover:text-white">
                Dashboard
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-purple-600 hover:bg-purple-700">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
