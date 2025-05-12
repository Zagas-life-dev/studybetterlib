"use client"

import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import { redirect, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Users, BookOpen, MessageSquare } from "lucide-react"
import AdminLayout from "@/components/admin-layout"

// Define TypeScript interfaces for our data structures
interface Course {
  id: string
  title: string
  code: string
  faculty: string
  summary_price?: number | null
  explanation_price?: number | null
  podcast_price?: number | null
  formats?: string[]
  created_at: string
}

interface User {
  id: string
  email: string
  full_name: string | null
  created_at: string
  is_admin: boolean
}

// Define types for recent feedback
interface Feedback {
  id: string
  subject: string
  status: string
  created_at: string
  user_email: string | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [userCount, setUserCount] = useState(0)
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function checkAdminAndLoadData() {
      setIsLoading(true)
      
      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }
      
      // Check admin status
      const { data: user } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from("profiles").select("is_admin, email").eq("id", session.user.id).single()
      
      const isAdminEmail = user?.user?.email === "studybetter.ai@gmail.com"
      const isAdminFlag = profile?.is_admin === true
      
      if (!isAdminFlag && !isAdminEmail) {
        router.push("/dashboard")
        return
      }
      
      setIsAdmin(true)
      
      try {
        // Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false })
        
        if (coursesError) {
          console.error("Error fetching courses:", coursesError)
        } else {
          setCourses(coursesData || [])
        }
        
        // Fetch users
        const { data: usersData, error: usersError } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at, is_admin")
          .order("created_at", { ascending: false })
          .limit(5);
        
        if (usersError) {
          console.error("Error fetching users:", usersError.message, usersError.details)
        } else {
          setUsers(usersData || [])
          
          // Get user count in a separate query
          const { count: usersCount, error: countError } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true });
            
          if (countError) {
            console.error("Error counting users:", countError.message)
            setUserCount(usersData?.length || 0)
          } else {
            setUserCount(usersCount || 0)
          }
        }
        
        // Fetch recent feedback
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("feedback")
          .select("id, subject, status, created_at, user_email")
          .order("created_at", { ascending: false })
          .limit(5)
          
        if (feedbackError) {
          console.error("Error fetching feedback:", feedbackError)
        } else {
          setFeedback(feedbackData || [])
          
          // Get feedback count in a separate query
          const { count: feedbackCount, error: feedbackCountError } = await supabase
            .from("feedback")
            .select("id", { count: "exact", head: true });
            
          if (feedbackCountError) {
            console.error("Error counting feedback:", feedbackCountError)
            setFeedbackCount(feedbackData?.length || 0)
          } else {
            setFeedbackCount(feedbackCount || 0)
          }
        }
        
      } catch (error) {
        console.error("Error loading admin data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAdminAndLoadData()
  }, [])

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading admin dashboard...</div>
  }

  if (!isAdmin) {
    return null // Will redirect in useEffect
  }

  return (
    <AdminLayout>
      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Button asChild>
              <Link href="/admin/courses/new">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add New Course
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Users</CardTitle>
                <CardDescription>Registered platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-500" />
                  <p className="text-3xl font-bold">{userCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Courses</CardTitle>
                <CardDescription>Available courses on platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-purple-500" />
                  <p className="text-3xl font-bold">{courses?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Feedback</CardTitle>
                <CardDescription>User submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-purple-500" />
                  <p className="text-3xl font-bold">{feedbackCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Latest registered users</CardDescription>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.full_name || "Unnamed User"}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                        <p className="text-sm text-gray-400">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No users found.</p>
                )}

                <div className="mt-4 text-right">
                  <Button variant="link" asChild>
                    <Link href="/admin/users">View All Users</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Recent Feedback</CardTitle>
                <CardDescription>Latest user feedback</CardDescription>
              </CardHeader>
              <CardContent>
                {feedback.length > 0 ? (
                  <div className="space-y-4">
                    {feedback.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.subject}</p>
                          <p className="text-sm text-gray-400">{item.user_email || "Anonymous"}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'pending' ? 'bg-blue-500/20 text-blue-500' :
                            item.status === 'reviewed' ? 'bg-yellow-500/20 text-yellow-500' : 
                            'bg-green-500/20 text-green-500'
                          }`}>
                            {item.status}
                          </span>
                          <p className="text-sm text-gray-400 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No feedback found.</p>
                )}

                <div className="mt-4 text-right">
                  <Button variant="link" asChild>
                    <Link href="/admin/feedback">View All Feedback</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Management</CardTitle>
                  <CardDescription>Manage your platform courses</CardDescription>
                </div>
                <Button asChild>
                  <Link href="/admin/courses/new">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Course
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {courses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4">Title</th>
                        <th className="text-left py-3 px-4">Code</th>
                        <th className="text-left py-3 px-4">Faculty</th>
                        <th className="text-left py-3 px-4">Price Range</th>
                        <th className="text-left py-3 px-4">Formats</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => {
                        // Calculate price range
                        const prices = [
                          course.summary_price,
                          course.explanation_price,
                          course.podcast_price
                        ].filter(price => price !== null && price !== undefined) as number[];
                        
                        const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
                        const highestPrice = prices.length > 0 ? Math.max(...prices) : null;
                        
                        // Format price display
                        let priceDisplay = "N/A";
                        if (lowestPrice !== null && highestPrice !== null) {
                          if (lowestPrice === highestPrice) {
                            priceDisplay = `₦${lowestPrice.toLocaleString()}`;
                          } else {
                            priceDisplay = `₦${lowestPrice.toLocaleString()} - ₦${highestPrice.toLocaleString()}`;
                          }
                        }
                        
                        return (
                          <tr key={course.id} className="border-b border-gray-800">
                            <td className="py-3 px-4">{course.title}</td>
                            <td className="py-3 px-4">{course.code}</td>
                            <td className="py-3 px-4">{course.faculty}</td>
                            <td className="py-3 px-4">{priceDisplay}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                {course.formats && course.formats.includes("summary") && (
                                  <span className="text-xs bg-gray-800 px-2 py-1 rounded">Summary</span>
                                )}
                                {course.formats && course.formats.includes("explanation") && (
                                  <span className="text-xs bg-gray-800 px-2 py-1 rounded">Explanation</span>
                                )}
                                {course.formats && course.formats.includes("podcast") && (
                                  <span className="text-xs bg-gray-800 px-2 py-1 rounded">Podcast</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/admin/courses/${course.id}/edit`}>Edit</Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4">No courses found. Add your first course to get started.</p>
                  <Button asChild>
                    <Link href="/admin/courses/new">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add New Course
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </AdminLayout>
  )
}
