"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Edit, Trash2, List, Grid } from "lucide-react"
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

// Added for table functionality
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Course {
  id: string
  title: string
  code: string
  faculty: string
  department: string
  university?: string
  formats?: string[]
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, code, faculty, department, university, formats")
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

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.faculty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.university && course.university.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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

  const renderCoursesGrid = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredCourses.map((course) => (
        <Card key={course.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{course.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Code:</strong> {course.code}</p>
            <p><strong>Faculty:</strong> {course.faculty}</p>
            <p><strong>Department:</strong> {course.department}</p>
            {course.university && <p><strong>University:</strong> {course.university}</p>}
            {course.formats && course.formats.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {course.formats.map((format) => (
                  <Badge key={format} variant="outline" className="capitalize">
                    {format}
                  </Badge>
                ))}
              </div>
            )}
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
  )

  const renderCoursesTable = () => (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Title</TableHead>
            <TableHead className="w-[100px]">Code</TableHead>
            <TableHead>Faculty</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>University</TableHead>
            <TableHead>Formats</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCourses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No courses match your search.
              </TableCell>
            </TableRow>
          ) : (
            filteredCourses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.title}</TableCell>
                <TableCell>{course.code}</TableCell>
                <TableCell>{course.faculty}</TableCell>
                <TableCell>{course.department}</TableCell>
                <TableCell>{course.university || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {course.formats && course.formats.map((format) => (
                      <Badge key={format} variant="outline" className="capitalize">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/courses/${course.id}`}>
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/admin/courses/edit/${course.id}`}>
                      <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-600">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setCourseToDelete(course.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">Course Management</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-gray-100" : ""}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setViewMode("table")}
              className={viewMode === "table" ? "bg-gray-100" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Link href="/admin/courses/new">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Course
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-10">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-10">
            <p>No courses found.</p>
          </div>
        ) : (
          viewMode === "grid" ? renderCoursesGrid() : renderCoursesTable()
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