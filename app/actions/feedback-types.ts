// Types for the feedback system
export type FeedbackCategory = string
export type FeedbackStatus = string 

// Common status values
export const STATUS_PENDING = "pending"
export const STATUS_IN_PROGRESS = "in_progress"
export const STATUS_RESOLVED = "resolved"

// Common category values
export const CATEGORY_GENERAL = "general"
export const CATEGORY_COURSE_CONTENT = "course_content"
export const CATEGORY_TECHNICAL = "technical" 
export const CATEGORY_SUGGESTION = "suggestion"
export const CATEGORY_OTHER = "other"

export interface FeedbackFormData {
  subject: string
  message: string
  category: FeedbackCategory
  rating?: number
  email?: string // For anonymous feedback
}

export interface FeedbackItem {
  id: string
  subject: string
  message: string
  category: FeedbackCategory
  rating: number | null
  status: FeedbackStatus
  user_id: string | null
  user_email: string | null
  created_at: string
  updated_at: string
  admin_notes: string | null
}

export interface FeedbackResponse {
  id: string
  feedback_id: string
  admin_id: string | null
  message: string
  created_at: string
}