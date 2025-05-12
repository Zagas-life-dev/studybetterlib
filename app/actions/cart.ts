"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function addToCart(formData: FormData) {
  const courseId = formData.get("courseId") as string
  const formats = JSON.parse(formData.get("formats") as string) as string[]
  const price = Number.parseFloat(formData.get("price") as string)

  if (!courseId || !formats || !price) {
    return { error: "Missing required fields" }
  }

  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Not authenticated" }
  }

  // Check if item already exists in cart
  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("course_id", courseId)
    .single()

  if (existingItem) {
    // Update existing item
    const { error } = await supabase
      .from("cart_items")
      .update({
        formats,
        price,
      })
      .eq("id", existingItem.id)

    if (error) {
      return { error: error.message }
    }
  } else {
    // Insert new item
    const { error } = await supabase.from("cart_items").insert({
      user_id: session.user.id,
      course_id: courseId,
      formats,
      price,
    })

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath("/cart")
  revalidatePath("/library")

  return { success: true }
}

export async function removeFromCart(formData: FormData) {
  const itemId = formData.get("itemId") as string

  if (!itemId) {
    return { error: "Missing item ID" }
  }

  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("cart_items").delete().eq("id", itemId).eq("user_id", session.user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/cart")

  return { success: true }
}
