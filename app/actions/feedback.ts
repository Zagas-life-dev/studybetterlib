"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  FeedbackCategory, 
  FeedbackStatus,
  FeedbackFormData,
  FeedbackItem,
  FeedbackResponse,
  STATUS_PENDING,
  STATUS_IN_PROGRESS,
  STATUS_RESOLVED
} from "./feedback-types"

/**
 * Submit user feedback
 */
export async function submitFeedback(formData: FeedbackFormData): Promise<{ error: string | null, success: boolean }> {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    const userEmail = session?.user?.email
    
    // Get email input for anonymous submissions
    const email = formData.email || userEmail || null
    
    // Basic validation
    if (!formData.subject?.trim()) {
      return { error: "Subject is required", success: false }
    }
    
    if (!formData.message?.trim()) {
      return { error: "Message is required", success: false }
    }
    
    if (!formData.category) {
      return { error: "Category is required", success: false }
    }
    
    // Submit feedback to database
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
        rating: formData.rating || null,
        user_id: userId || null,
        user_email: email,
      })
      .select("id")
      .single()
    
    if (error) {
      console.error("Error submitting feedback:", error)
      return { 
        error: "Failed to submit feedback. Please try again.",
        success: false 
      }
    }
    
    return { error: null, success: true }
  } catch (error) {
    console.error("Error in submitFeedback:", error)
    return { 
      error: "An unexpected error occurred. Please try again.", 
      success: false 
    }
  }
}

/**
 * Get user's own feedback submissions
 */
export async function getUserFeedback(): Promise<{ data: FeedbackItem[] | null, error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching user feedback:", error)
      return { data: null, error: "Failed to fetch feedback" }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error("Error in getUserFeedback:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Get all feedback for admin view
 */
export async function getAllFeedback(): Promise<{ data: FeedbackItem[] | null, error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching all feedback:", error)
      return { data: null, error: "Failed to fetch feedback" }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error("Error in getAllFeedback:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Update feedback status
 */
export async function updateFeedbackStatus(
  feedbackId: string, 
  status: FeedbackStatus,
  adminNotes?: string
): Promise<{ success: boolean, error: string | null }> {
  try {
    const supabase = await createClient()
    
    // Use the shared admin check function
    const { isAdmin, error: adminError, userId } = await import('./admin').then(module => module.checkAdminAccess());
    
    if (!isAdmin) {
      return { success: false, error: adminError || "Not authorized" };
    }
    
    // Update the feedback status
    const updateData: { status: FeedbackStatus, admin_notes?: string } = { status }
    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes
    }
    
    const { error } = await supabase
      .from("feedback")
      .update(updateData)
      .eq("id", feedbackId)
    
    if (error) {
      console.error("Error updating feedback status:", error)
      return { success: false, error: "Failed to update feedback status" }
    }
    
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in updateFeedbackStatus:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Add admin response to feedback
 */
export async function addFeedbackResponse(
  feedbackId: string,
  message: string
): Promise<{ success: boolean, error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Use the shared admin check function
    const { isAdmin, error: adminError, userId } = await import('./admin').then(module => module.checkAdminAccess());
    
    if (!isAdmin) {
      return { success: false, error: adminError || "Not authorized" };
    }
    
    const adminId = userId;
    
    // Add the response
    const { error } = await supabase
      .from("feedback_responses")
      .insert({
        feedback_id: feedbackId,
        admin_id: adminId,
        message,
      })
    
    if (error) {
      console.error("Error adding feedback response:", error)
      return { success: false, error: "Failed to add response" }
    }
    
    // Also mark feedback as in_progress
    await supabase
      .from("feedback")
      .update({ status: "in_progress" })
      .eq("id", feedbackId)
    
    // First get the basic feedback data
    const { data: feedbackData, error: feedbackError } = await supabase
      .from("feedback")
      .select("*")
      .eq("id", feedbackId)
      .single();
      
    if (feedbackError || !feedbackData) {
      console.error("Error fetching feedback data:", feedbackError);
      return { success: true, error: null }; // Still return success as the response was added
    }
    
    // If there's a user_id, get the profile data in a separate query
    let userName = 'there';
    let userEmail = feedbackData.user_email;
    
    if (feedbackData.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", feedbackData.user_id)
        .single();
        
      if (!profileError && profileData) {
        userName = profileData.full_name || 'there';
        // Only use profile email if we don't already have a user_email
        if (!userEmail) {
          userEmail = profileData.email;
        }
      }
    }
    
    // Send email notification if user email is available
    if (userEmail) {
      try {
        // Import email utilities
        const { generateFeedbackResponseEmail } = await import('@/utils/email')
        
        // Generate and send email
        await generateFeedbackResponseEmail({
          userName,
          subject: feedbackData.subject,
          originalMessage: feedbackData.message,
          adminResponse: message,
          to: userEmail
        })
      } catch (emailError) {
        // Log email error but don't fail the response
        console.error("Error sending feedback response email:", emailError)
      }
    }
    
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in addFeedbackResponse:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Get responses for a specific feedback
 */
export async function getFeedbackResponses(
  feedbackId: string
): Promise<{ data: FeedbackResponse[] | null, error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("feedback_responses")
      .select("*")
      .eq("feedback_id", feedbackId)
      .order("created_at", { ascending: true })
    
    if (error) {
      console.error("Error fetching feedback responses:", error)
      return { data: null, error: "Failed to fetch responses" }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error("Error in getFeedbackResponses:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Delete feedback
 */
export async function deleteFeedback(feedbackId: string): Promise<{ success: boolean, error: string | null }> {
  try {
    const supabase = await createClient()
    
    // Use the shared admin check function
    const { isAdmin, error: adminError } = await import('./admin').then(module => module.checkAdminAccess());
    
    if (!isAdmin) {
      return { success: false, error: adminError || "Not authorized" };
    }
    
    // Delete the feedback
    const { error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", feedbackId)
    
    if (error) {
      console.error("Error deleting feedback:", error)
      return { success: false, error: "Failed to delete feedback" }
    }
    
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteFeedback:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Send an email response to a feedback submission
 */
export async function sendFeedbackResponseEmail(
  feedbackId: string,
  responseMessage: string
): Promise<{ success: boolean, error: string | null }> {
  try {
    console.log("Starting sendFeedbackResponseEmail for feedback:", feedbackId);
    const supabase = await createClient();
    
    // Use the shared admin check function
    const { isAdmin, error: adminError, userId } = await import('./admin').then(module => module.checkAdminAccess());
    
    if (!isAdmin) {
      console.error("Admin access check failed:", adminError);
      return { success: false, error: adminError || "Not authorized" };
    }
    
    const adminId = userId;
    console.log("Admin verification successful");
    
    // First get the basic feedback data
    const { data: feedbackData, error: feedbackError } = await supabase
      .from("feedback")
      .select("*")
      .eq("id", feedbackId)
      .single();
    
    if (feedbackError) {
      console.error("Feedback fetch error:", feedbackError);
      return { success: false, error: "Failed to fetch feedback data: " + feedbackError.message };
    }
    
    if (!feedbackData) {
      console.error("No feedback found with ID:", feedbackId);
      return { success: false, error: "Feedback not found" };
    }
    
    // If there's a user_id, get the profile data in a separate query
    let userName = 'there';
    let userEmail = feedbackData.user_email;
    
    if (feedbackData.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", feedbackData.user_id)
        .single();
        
      if (!profileError && profileData) {
        userName = profileData.full_name || 'there';
        // Only use profile email if we don't already have a user_email
        if (!userEmail) {
          userEmail = profileData.email;
        }
      } else if (profileError) {
        console.log("Non-critical profile fetch error:", profileError);
        // Not returning early as this is non-critical
      }
    }
    
    if (!userEmail) {
      console.error("No email address available for feedback:", feedbackId);
      return { success: false, error: "No email address available for this feedback" };
    }
    
    console.log("Preparing to send email to:", userEmail);
    
    // Import email utilities
    const { generateFeedbackResponseEmail } = await import('@/utils/email');
    
    // Send email with the updated function
    const emailResult = await generateFeedbackResponseEmail({
      userName,
      subject: feedbackData.subject,
      originalMessage: feedbackData.message,
      adminResponse: responseMessage,
      to: userEmail
    });
    
    if (!emailResult.success) {
      console.error("Email sending failed:", emailResult.error);
      return { success: false, error: emailResult.error || "Failed to send email" };
    }
    
    console.log("Email sent successfully to:", userEmail);
    
    // Record this response in feedback_responses table
    const { error: responseError } = await supabase
      .from("feedback_responses")
      .insert({
        feedback_id: feedbackId,
        admin_id: adminId,
        message: responseMessage,
      });
    
    if (responseError) {
      console.error("Error recording feedback response:", responseError);
      return { success: true, error: "Email sent but response not recorded in database" };
    }
    
    // Update feedback status to in_progress
    const { error: updateError } = await supabase
      .from("feedback")
      .update({ 
        status: "in_progress",
        admin_response: responseMessage
      })
      .eq("id", feedbackId);
      
    if (updateError) {
      console.error("Error updating feedback status:", updateError);
      return { success: true, error: "Email sent but feedback status update failed" };
    }
    
    console.log("Feedback response process completed successfully");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Unhandled error in sendFeedbackResponseEmail:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}