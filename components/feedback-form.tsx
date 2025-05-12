"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { submitFeedback } from "@/app/actions/feedback"
import { FeedbackCategory } from "@/app/actions/feedback"
import { useNotification } from "@/components/notification-provider"

// Define the form schema with Zod
const formSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(100, "Subject is too long"),
  message: z.string().min(1, "Message is required").max(1000, "Message is too long"),
  category: z.enum(["general", "course_content", "technical", "suggestion", "other"] as const),
  rating: z.number().min(1).max(5).optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
})

// Type for our form values
type FormValues = z.infer<typeof formSchema>

interface FeedbackFormProps {
  userEmail?: string
  isAuthenticated?: boolean
  onSuccess?: () => void
}

export default function FeedbackForm({ userEmail, isAuthenticated = false, onSuccess }: FeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { showNotification } = useNotification()
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      message: "",
      category: "general",
      rating: undefined,
      email: userEmail || "",
    },
  })

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const result = await submitFeedback(values)
      
      if (result.success) {
        // Show auto-dismiss notification
        showNotification({
          title: "Feedback Submitted",
          message: "Thank you for your feedback! We appreciate your input and will review it shortly.",
          type: "success"
        })
        
        form.reset()
        if (onSuccess) {
          onSuccess()
        }
      } else {
        showNotification({
          title: "Error",
          message: result.error || "Something went wrong. Please try again.",
          type: "error"
        })
      }
    } catch (error) {
      showNotification({
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        type: "error"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">We Value Your Feedback</h2>
        <p className="text-muted-foreground">
          Your feedback helps us improve our platform. Please share your thoughts, suggestions, or report any issues.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Subject Field */}
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input placeholder="Brief description of your feedback" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Category Select */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="course_content">Course Content</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Message Textarea */}
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Please provide details about your feedback" 
                    className="min-h-32"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Rating Field */}
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Rating (Optional)</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                    className="flex space-x-4"
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <FormItem key={rating} className="flex items-center space-x-1 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={rating.toString()} />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">{rating}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  Rate your experience from 1 (poor) to 5 (excellent)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Email Field (for not authenticated users) */}
          {!isAuthenticated && (
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="Your email if you'd like us to respond" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    We'll only use this to respond to your feedback
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <Button 
            type="submit" 
            className="w-full sm:w-auto" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </Form>
    </div>
  )
}