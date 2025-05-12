"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function createAdminAccount() {
  const supabase = await createClient()

  // This requires that the service role key is used
  // This won't work with the anon key due to security restrictions

  try {
    // First check if the user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", "studybetter.ai@gmail.com")
      .maybeSingle()

    if (checkError && !checkError.message.includes("does not exist")) {
      throw checkError
    }

    let userId = existingUser?.id

    if (!userId) {
      // Create the user
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: "studybetter.ai@gmail.com",
        password: "studyAIlogin@admin.1709",
        email_confirm: true,
        user_metadata: {
          full_name: "Admin User",
        },
      })

      if (userError) {
        throw userError
      }

      userId = userData.user.id
    }

    // Set admin flag in profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email: "studybetter.ai@gmail.com",
      full_name: "Admin User",
      is_admin: true,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      throw profileError
    }

    revalidatePath("/admin")

    return { success: true, userId }
  } catch (error: any) {
    console.error("Error creating admin account:", error)
    return {
      success: false,
      error: error.message || "An error occurred while creating the admin account",
    }
  }
}

/**
 * Check if the current user has admin access
 * Returns an object with isAdmin boolean and an error message if not admin
 */
export async function checkAdminAccess() {
  const supabase = await createClient();
  
  // First verify user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { 
      isAdmin: false, 
      error: "Not authenticated" 
    };
  }
  
  // Check if user is admin via profile flag or has the admin email
  const { data: user } = await supabase.auth.getUser();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin, role")
    .eq("id", session.user.id)
    .single();
    
  const isAdminEmail = user?.user?.email === "studybetter.ai@gmail.com";
  const isAdminFlag = profile?.is_admin === true || profile?.role === "admin";
  
  if (!isAdminFlag && !isAdminEmail) {
    return { 
      isAdmin: false, 
      error: "Unauthorized: Admin access required",
      userId: session.user.id
    };
  }
  
  return { 
    isAdmin: true, 
    error: null,
    userId: session.user.id
  };
}

interface CourseData {
  title: string
  description?: string
  code: string
  faculty: string
  department: string
  image_url?: string
}

export async function updateCourse(courseId: string, courseData: CourseData) {
  const supabase = await createClient()

  // First verify admin status
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Not authenticated" }
  }

  // Check if user is admin or has the admin email
  const { data: user } = await supabase.auth.getUser()
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", session.user.id)
    .single()

  const isAdminEmail = user?.user?.email === "studybetter.ai@gmail.com"
  const isAdminFlag = profile?.is_admin === true

  if (!isAdminFlag && !isAdminEmail) {
    return { success: false, error: "Unauthorized: Admin access required" }
  }

  try {
    const { error } = await supabase.from("courses").update(courseData).eq("id", courseId)

    if (error) {
      throw error
    }

    revalidatePath("/admin/courses")
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath("/courses")

    return { success: true }
  } catch (error: any) {
    console.error("Error updating course:", error)
    return {
      success: false,
      error: error.message || "An error occurred while updating the course",
    }
  }
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient()

  // First verify admin status
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Not authenticated" }
  }

  // Check if user is admin or has the admin email
  const { data: user } = await supabase.auth.getUser()
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", session.user.id)
    .single()

  const isAdminEmail = user?.user?.email === "studybetter.ai@gmail.com"
  const isAdminFlag = profile?.is_admin === true

  if (!isAdminFlag && !isAdminEmail) {
    return { success: false, error: "Unauthorized: Admin access required" }
  }

  try {
    // First check if there are any dependencies (enrollments, materials, etc.)
    const { data: enrollments, error: enrollmentCheckError } = await supabase
      .from("course_enrollments")
      .select("id", { count: "exact" })
      .eq("course_id", courseId)
      .limit(1)

    if (enrollmentCheckError) {
      throw enrollmentCheckError
    }

    if (enrollments && enrollments.length > 0) {
      return {
        success: false,
        error: "Cannot delete course: Students are enrolled in this course",
      }
    }

    // Check for course materials
    const { data: materials, error: materialsCheckError } = await supabase
      .from("course_materials")
      .select("id", { count: "exact" })
      .eq("course_id", courseId)
      .limit(1)

    if (materialsCheckError) {
      throw materialsCheckError
    }

    if (materials && materials.length > 0) {
      return {
        success: false,
        error: "Cannot delete course: Course has associated materials. Delete materials first.",
      }
    }

    // Delete the course
    const { error } = await supabase.from("courses").delete().eq("id", courseId)

    if (error) {
      throw error
    }

    revalidatePath("/admin/courses")
    revalidatePath("/courses")

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting course:", error)
    return {
      success: false,
      error: error.message || "An error occurred while deleting the course",
    }
  }
}
