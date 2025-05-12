"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const fullName = formData.get("fullName") as string
  const bio = formData.get("bio") as string

  if (!fullName) {
    return { error: "Name is required" }
  }

  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      bio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  revalidatePath("/dashboard")

  return { success: true }
}

export async function updateUserStats(
  userId: string,
  statsData: {
    total_hours?: number
    total_notes?: number
  },
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("user_stats")
    .update({
      ...statsData,
      last_updated: new Date().toISOString(),
    })
    .eq("user_id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")

  return { success: true }
}

export async function updateLearningProgress(userId: string, courseId: string, progress: number) {
  const supabase = await createClient()

  // Check if progress record exists
  const { data: existingProgress } = await supabase
    .from("learning_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single()

  if (existingProgress) {
    // Update existing progress
    const { error } = await supabase
      .from("learning_progress")
      .update({
        progress_percentage: progress,
        last_accessed: new Date().toISOString(),
        completed: progress === 100,
        completed_at: progress === 100 ? new Date().toISOString() : existingProgress.completed_at,
      })
      .eq("id", existingProgress.id)

    if (error) {
      return { error: error.message }
    }
  } else {
    // Create new progress record
    const { error } = await supabase.from("learning_progress").insert({
      user_id: userId,
      course_id: courseId,
      progress_percentage: progress,
      completed: progress === 100,
      completed_at: progress === 100 ? new Date().toISOString() : null,
    })

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath("/dashboard")
  revalidatePath(`/courses/${courseId}`)

  return { success: true }
}
