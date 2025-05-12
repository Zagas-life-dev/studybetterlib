"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Search, UserPlus, Mail, Shield, ShieldCheck, ShieldX } from "lucide-react"

interface User {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  created_at: string
  avatar_url?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const supabase = createClient()
  const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching users:", error.message, error.details)
        toast({
          title: "Error",
          description: `Failed to load users: ${error.message}`,
          variant: "destructive",
        })
        // Still set users to empty array to allow the UI to render
        setUsers([])
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching users",
        variant: "destructive",
      })
      // Set users to empty array on error
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === "" ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filter by role
    const matchesRole = 
      filterRole === "all" ||
      (filterRole === "admin" && user.is_admin) ||
      (filterRole === "user" && !user.is_admin)
    
    return matchesSearch && matchesRole
  })

  const toggleAdminStatus = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !isCurrentlyAdmin })
        .eq("id", userId)

      if (error) {
        console.error("Error updating user:", error)
        toast({
          title: "Error",
          description: `Failed to update user: ${error.message}`,
          variant: "destructive",
        })
      } else {
        // Update local state
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user, is_admin: !isCurrentlyAdmin } 
            : user
        ))
        
        toast({
          title: "Success",
          description: `User ${isCurrentlyAdmin ? "removed from" : "added to"} administrators`,
        })
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        toast({
          title: "Error",
          description: `Failed to send reset email: ${error.message}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Password reset email sent",
        })
      }
    } catch (err) {
      console.error("Error sending reset email:", err)
      toast({
        title: "Error",
        description: "Failed to send reset email",
        variant: "destructive",
      })
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>User Statistics</CardTitle>
            <CardDescription>Overview of platform users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Total Users</div>
                <div className="text-2xl font-bold">{users.length}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Administrators</div>
                <div className="text-2xl font-bold">{users.filter(user => user.is_admin).length}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">New Users (30 days)</div>
                <div className="text-2xl font-bold">
                  {users.filter(user => {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return new Date(user.created_at) >= thirtyDaysAgo;
                  }).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage platform users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={filterRole}
                onValueChange={setFilterRole}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Administrators</SelectItem>
                  <SelectItem value="user">Regular Users</SelectItem>
                </SelectContent>
              </Select>
              <Button className="md:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-10">Loading users...</div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name || "Unnamed User"}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.is_admin ? (
                              <div className="flex items-center">
                                <ShieldCheck className="h-4 w-4 text-purple-500 mr-1" />
                                <span>Administrator</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Shield className="h-4 w-4 text-gray-500 mr-1" />
                                <span>User</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => sendPasswordResetEmail(user.email)}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant={user.is_admin ? "destructive" : "outline"} 
                                size="sm"
                                onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                              >
                                {user.is_admin ? (
                                  <ShieldX className="h-4 w-4" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
                          No users found matching your criteria
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}