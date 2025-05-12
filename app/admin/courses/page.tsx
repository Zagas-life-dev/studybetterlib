"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Edit, Trash2 } from "lucide-react"
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
import { deleteCourse } from "@/app/actions/admin"
import { useToast } from "@/components/ui/use-toast"
import AdminLayout from "@/components/admin-layout"

interface Course {
  id: string
  title: string
  code: string
  faculty: string
  department: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, code, faculty, department")
        .order("title")

      if (error) {
        console.error("Error fetching courses:", error.message, error.details)
        toast({
          title: "Error",
          description: `Failed to load courses: ${error.message}`,
          variant: "destructive",
        })
      } else {
        setCourses(data || [])
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching courses",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return

    try {
      setIsDeleting(true)
      const result = await deleteCourse(courseToDelete)

      if (result.success) {
        toast({
          title: "Success",
          description: "Course deleted successfully",
        })
        // Remove the course from state
        setCourses((prev) => prev.filter(course => course.id !== courseToDelete))
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete course",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting course:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setCourseToDelete(null)
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Course Management</h1>
          <Link href="/admin/courses/new">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Course
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-10">
            <p>No courses found.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>Code:</strong> {course.code}</p>
                  <p><strong>Faculty:</strong> {course.faculty}</p>
                  <p><strong>Department:</strong> {course.department}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/admin/courses/${course.id}`}>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/admin/courses/edit/${course.id}`}>
                      <Button variant="outline" size="sm" className="text-amber-500 hover:text-amber-600">
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setCourseToDelete(course.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this course?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The course will be permanently deleted from the database.
                Students will no longer have access to this course or its materials.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCourse}
                disabled={isDeleting} 
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}