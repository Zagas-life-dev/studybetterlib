"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import CourseCard from "@/components/course-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, BookOpen, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface Course {
  id: string
  title: string
  code: string
  faculty: string
  department?: string
  university?: string
  description?: string
  summary_price?: number
  explanation_price?: number
  podcast_price?: number
  combo_summary_podcast_price?: number
  combo_summary_explanation_price?: number
  combo_explanation_podcast_price?: number
  combo_all_price?: number
  formats: string[]
  created_at?: string
  updated_at?: string
  image_url?: string
}

interface LibraryClientProps {
  initialCourses: Course[]
  session: any
}

export default function LibraryClient({ initialCourses, session }: LibraryClientProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [searchQuery, setSearchQuery] = useState("")
  const [formatFilter, setFormatFilter] = useState("all-formats")
  const [facultyFilter, setFacultyFilter] = useState("all-faculties")
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(initialCourses)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const supabase = createClient()

  // Extract unique faculties for the dropdown
  const uniqueFaculties = Array.from(new Set(courses.map(course => course.faculty?.toLowerCase() || '')))
    .filter(Boolean) // Remove empty values

  // Refresh courses data from the database
  const refreshCourses = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false })
        
      if (error) {
        throw new Error(error.message)
      }
      
      setCourses(data || [])
    } catch (err: any) {
      console.error("Error refreshing courses:", err)
      setError("Failed to load courses. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters whenever search or filter selections change
  useEffect(() => {
    let result = [...courses]
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        course => 
          course.title?.toLowerCase().includes(query) || 
          course.code?.toLowerCase().includes(query) ||
          course.faculty?.toLowerCase().includes(query) ||
          (course.department && course.department.toLowerCase().includes(query)) ||
          (course.university && course.university.toLowerCase().includes(query)) ||
          (course.description && course.description.toLowerCase().includes(query))
      )
    }
    
    // Apply format filter
    if (formatFilter !== "all-formats") {
      result = result.filter(course => 
        course.formats && course.formats.includes(formatFilter)
      )
    }
    
    // Apply faculty filter
    if (facultyFilter !== "all-faculties") {
      result = result.filter(course => 
        course.faculty?.toLowerCase() === facultyFilter.toLowerCase()
      )
    }
    
    setFilteredCourses(result)
  }, [searchQuery, formatFilter, facultyFilter, courses])

  // Render empty state when no courses are available at all
  if (courses.length === 0 && !isLoading && !error) {
    return (
      <div className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Course Library</h1>
            <p className="text-gray-400">Browse available courses and learning materials</p>
          </div>
          
          <div className="text-center py-16 bg-gray-900/30 rounded-lg">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-2xl font-medium mb-2">No courses available yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              We are working on adding course materials to our library.
              Check back soon for new content!
            </p>
            <Button onClick={refreshCourses} variant="outline">
              Refresh Library
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Course Library</h1>
            <p className="text-gray-400">Browse available courses and learning materials</p>
          </div>
          
          <div className="text-center py-16 bg-red-900/20 rounded-lg border border-red-800">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-2xl font-medium mb-2">Error Loading Courses</h3>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={refreshCourses} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main render with filters and course list
  return (
    <div className="flex-1 py-10">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course Library</h1>
          <p className="text-gray-400">Browse available courses and learning materials</p>
        </div>

        <div className="bg-gray-900/50 p-6 rounded-lg mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search courses..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex  sm:flex-row gap-4 ">
              <Select 
                value={formatFilter} 
                onValueChange={setFormatFilter}
              >
                
                    <SelectTrigger className="w-[180px] sm:w-[140px]">
                      <SelectValue placeholder="All Formats" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-formats">All Formats</SelectItem>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="explanation">Explanation</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                    </SelectContent>
                
                  </Select>

                  <Select value={facultyFilter}  onValueChange={setFacultyFilter} disabled={uniqueFaculties.length === 0} >
                    <SelectTrigger className="w-[180px] sm:w-[140px]">
                      <SelectValue placeholder="All Faculties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-faculties">All Faculties</SelectItem>
                      {uniqueFaculties.map(faculty => (
                        <SelectItem key={faculty} value={faculty}>
                          {faculty.charAt(0).toUpperCase() + faculty.slice(1)}
                        </SelectItem>  ))}
                    </SelectContent>
                  </Select>
              
              
              <Button variant="ghost" onClick={refreshCourses} disabled={isLoading}>
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <h3 className="text-xl font-medium mb-2">No courses match your filters</h3>
            <p className="text-gray-400 mb-4">Try adjusting your search or filter criteria</p>
            <button 
              onClick={() => {
                setSearchQuery("");
                setFormatFilter("all-formats");
                setFacultyFilter("all-faculties");
              }}
              className="text-purple-400 hover:text-purple-300"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
