"use client"

import Link from "next/link"
import { Session } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Menu, Sun, Moon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import SignOutButton from "./sign-out-button"
import { useTheme } from "next-themes"

interface DashboardHeaderProps {
  session: Session
  cartCount: number
}

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function DashboardHeader({ session, cartCount }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()

  const userFullName = session.user?.user_metadata?.full_name || session.user?.email || ""
  const userName = userFullName.split(" ")[0]
  const userInitials = getUserInitials(userName)
  const navigationLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/library", label: "Library" },
//     { href: "/study-ai", label: "AI Chat" },
    { href: "/feedback", label: "Feedback" },
    { href: "/profile", label: "Profile" },
  ]

  return (
    <header className="border-b border-gray-800 bg-black">
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold">
              Study Better
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
           

            {/* Mobile Navigation */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navigationLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-medium text-white">
                    {userInitials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SignOutButton className="w-full text-left" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

           
          </div>
        </nav>
      </div>
    </header>
  )
}
