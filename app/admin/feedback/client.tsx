"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Search, Filter, RefreshCw, CheckCircle, XCircle, MessageSquare, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { sendFeedbackResponseEmail } from "@/app/actions/feedback"
import { z } from "zod"
import {
  FeedbackStatus,
  FeedbackCategory,
  STATUS_PENDING,
  STATUS_IN_PROGRESS,
  STATUS_RESOLVED,
  CATEGORY_GENERAL,
  CATEGORY_COURSE_CONTENT,
  CATEGORY_TECHNICAL,
  CATEGORY_SUGGESTION,
  CATEGORY_OTHER
} from "@/app/actions/feedback-types"

interface Feedback {
  id: string
  user_id: string | null
  email: string | null
  subject: string
  message: string
  category: FeedbackCategory
  status: FeedbackStatus
  rating: number | null
  admin_notes: string | null
  admin_response: string | null
  created_at: string
  updated_at: string
  user_details?: {
    full_name?: string
    email?: string
  }
  user_email?: string
}

export default function AdminFeedbackClient() {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()
  
  // State variables
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [responseText, setResponseText] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendResponseEmail, setSendResponseEmail] = useState(true)
  const [showEmailAlert, setShowEmailAlert] = useState(false)
  
  // Function to load feedback data
  const loadFeedback = async () => {
    setIsLoading(true)
    
    try {
      console.log("Attempting to load feedback data...")
      
      // First check if we can access the data at all
      const { data: testData, error: testError } = await supabase
        .from('feedback')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.error("Access error:", testError)
        throw new Error(`${testError.message}${testError.details ? `: ${testError.details}` : ''}`)
      }
      
      // Basic select query - get just the feedback without joins first
      const { data: basicData, error: basicError } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (basicError) {
        console.error("Basic query error:", basicError)
        throw new Error(`${basicError.message}${basicError.details ? `: ${basicError.details}` : ''}`)
      }
      
      console.log("Basic feedback data fetched:", basicData?.length || 0, "items")
      
      // Apply filters to the basic query (if needed)
      let query = supabase
        .from('feedback')
        .select(`
          id,
          user_id,
          user_email,
          subject,
          message,
          category,
          status,
          rating,
          admin_notes,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
      
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter)
      }
      
      if (categoryFilter !== "all") {
        query = query.eq('category', categoryFilter)
      }
      
      if (searchQuery) {
        query = query.ilike('subject', `%${searchQuery}%`)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error("Query error:", error)
        throw new Error(`${error.message}${error.details ? `: ${error.details}` : ''}`)
      }
      
      if (!data || data.length === 0) {
        console.log("No feedback data found")
        setFeedbackItems([])
        return
      }
      
      console.log("Filtered feedback data loaded:", data.length, "items")
      
      // Get user details for feedback items that have a user_id
      const userIds = data
        .filter(item => item.user_id)
        .map(item => item.user_id)
      
      let userDetails = {}
      
      if (userIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          
          if (!profilesError && profilesData) {
            userDetails = profilesData.reduce((acc, profile) => {
              acc[profile.id] = {
                full_name: profile.full_name,
                email: profile.email
              }
              return acc
            }, {})
          }
        } catch (profileError) {
          console.warn("Could not fetch user profiles:", profileError)
        }
      }
      
      // Map the data to the format expected by the UI
      const processedData = data.map(item => {
        const user = item.user_id ? userDetails[item.user_id] : null
        
        return {
          id: item.id,
          user_id: item.user_id,
          subject: item.subject || '(No subject)',
          message: item.message || '',
          category: (item.category || 'general') as FeedbackCategory,
          status: (item.status || 'pending') as FeedbackStatus,
          rating: item.rating,
          admin_notes: item.admin_notes,
          admin_response: item.admin_response,
          created_at: item.created_at,
          updated_at: item.updated_at,
          user_email: item.user_email,
          user_details: user ? {
            full_name: user.full_name,
            email: user.email
          } : undefined
        }
      })
      
      console.log("Processed feedback data:", processedData.length, "items")
      setFeedbackItems(processedData)
    } catch (error) {
      console.error("Error loading feedback:", error)
      
      toast({
        title: "Failed to load feedback",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
      
      setFeedbackItems([])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Load feedback on mount and when filters change
  useEffect(() => {
    loadFeedback()
  }, [statusFilter, categoryFilter, searchQuery])
  
  // Function to update feedback status
  const updateFeedbackStatus = async (feedbackId: string, status: FeedbackStatus) => {
    try {
      console.log(`Updating feedback ${feedbackId} status to ${status}...`)
      
      // Check if we're authorized to do this first
      const { data: authTest, error: authError } = await supabase
        .from('feedback')
        .select('id')
        .eq('id', feedbackId)
        .limit(1)
      
      if (authError) {
        console.error("Auth check error:", authError)
        throw new Error(`Access error: ${authError.message}`)
      }
      
      // Then attempt the update
      const { error } = await supabase
        .from('feedback')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', feedbackId)
      
      if (error) {
        console.error("Status update error:", error)
        throw new Error(`Update failed: ${error.message}`)
      }
      
      console.log(`Successfully updated feedback ${feedbackId} status to ${status}`)
      
      // Update the local state
      setFeedbackItems(prevItems => 
        prevItems.map(item => 
          item.id === feedbackId ? { ...item, status, updated_at: new Date().toISOString() } : item
        )
      )
      
      toast({
        title: "Status updated",
        description: `Feedback status has been updated to ${status.replace('_', ' ')}.`
      })
    } catch (error) {
      console.error("Error updating status:", error)
      
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update feedback status. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Function to submit admin response
  const submitResponse = async () => {
    if (!selectedFeedback) return
    
    setIsSubmitting(true)
    
    try {
      // Check if we should send an email
      const userEmail = selectedFeedback.user_email || 
                        (selectedFeedback.user_details && selectedFeedback.user_details.email)
      
      if (sendResponseEmail && userEmail) {
        console.log("Sending response email to:", userEmail);
        
        // Send email response
        const emailResult = await sendFeedbackResponseEmail(
          selectedFeedback.id,
          responseText
        )
        
        if (emailResult.error) {
          console.error("Email delivery error:", emailResult.error);
          
          // Check if this is an authorization error
          if (emailResult.error.includes("Not authorized") || 
              emailResult.error.includes("Not authenticated")) {
            toast({
              title: "Authorization Error",
              description: "You don't have permission to send emails. Please ensure you're logged in with an admin account.",
              variant: "destructive"
            });
            throw new Error(emailResult.error);
          } else {
            toast({
              title: "Email delivery failed",
              description: emailResult.error,
              variant: "destructive"
            });
          }
          
          // If there's an error with the email but it's not an auth error,
          // still try to save the response in the database
          console.log("Saving response without sending email");
        } else {
          console.log("Email sent successfully");
          toast({
            title: "Response email sent",
            description: `Your response has been emailed to ${userEmail}`,
          });
        }
      }
      
      // Save the response in the database regardless of email status
      console.log("Updating feedback in database");
      const { error: updateError } = await supabase
        .from('feedback')
        .update({
          admin_response: responseText,
          admin_notes: adminNotes,
          status: selectedFeedback.status === 'pending' ? 'in_progress' : selectedFeedback.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFeedback.id);
        
      if (updateError) {
        console.error("Database update error:", updateError);
        throw updateError;
      } else {
        // Only show "saved" toast if we didn't already show the email toast
        if (!sendResponseEmail || !userEmail) {
          toast({
            title: "Response saved",
            description: sendResponseEmail ? 
              "Response saved but no email was sent because no user email is available." : 
              "Response saved successfully."
          });
        }
      }
      
      // Update local state
      setFeedbackItems(prevItems => 
        prevItems.map(item => 
          item.id === selectedFeedback.id ? { 
            ...item, 
            admin_response: responseText,
            admin_notes: adminNotes,
            status: item.status === 'pending' ? 'in_progress' : item.status,
            updated_at: new Date().toISOString()
          } : item
        )
      )
      
      // Close dialog and reset form
      setIsDialogOpen(false)
      setResponseText("")
      setAdminNotes("")
      setSelectedFeedback(null)
      
    } catch (error: any) {
      console.error("Error submitting response:", error)
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit your response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Function to handle opening the detail dialog
  const openFeedbackDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setResponseText(feedback.admin_response || "")
    setAdminNotes(feedback.admin_notes || "")
    
    // Check if user has provided an email
    const hasEmail = feedback.user_email || (feedback.user_details && feedback.user_details.email)
    setSendResponseEmail(hasEmail ? true : false)
    
    setIsDialogOpen(true)
  }
  
  // Helper to render status badge
  const renderStatusBadge = (status: FeedbackStatus) => {
    switch(status) {
      case 'pending':
        return <Badge variant="default" className="bg-blue-500">Pending</Badge>
      case 'in_progress':
        return <Badge variant="secondary" className="bg-amber-500 text-white">In Progress</Badge>
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500 text-white">Resolved</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div>
      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, message or email"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-1 gap-4">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as any)}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="course_content">Course Content</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="suggestion">Suggestion</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => loadFeedback()} className="ml-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Feedback table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Subject</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Submitted</TableHead>
                <TableHead className="hidden xl:table-cell">Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Loading feedback data...</p>
                  </TableCell>
                </TableRow>
              ) : feedbackItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <p className="text-muted-foreground">No feedback found matching your filters.</p>
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setStatusFilter("all");
                        setCategoryFilter("all");
                        setSearchQuery("");
                      }}
                    >
                      Clear filters
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                feedbackItems.map((feedback) => (
                  <TableRow key={feedback.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openFeedbackDetail(feedback)}>
                    <TableCell className="font-medium">{feedback.subject}</TableCell>
                    <TableCell>
                      {feedback.user_details?.full_name || feedback.user_email || "Anonymous"}
                      {(feedback.user_email || feedback.user_details?.email) && (
                        <Mail className="inline-block ml-2 h-3 w-3 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{feedback.category.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell>{renderStatusBadge(feedback.status)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {feedback.rating ? `${feedback.rating}/5` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        openFeedbackDetail(feedback);
                      }}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {feedback.admin_response ? "View" : "Respond"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Feedback Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFeedback.subject}</DialogTitle>
                <DialogDescription>
                  From: {selectedFeedback.user_details?.full_name || selectedFeedback.user_email || "Anonymous"} • 
                  Submitted: {new Date(selectedFeedback.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Feedback details */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-medium">Feedback</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {selectedFeedback.category.replace('_', ' ')}
                        </Badge>
                        {selectedFeedback.rating && (
                          <Badge variant="secondary">
                            Rating: {selectedFeedback.rating}/5
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{selectedFeedback.message}</p>
                  </CardContent>
                </Card>
                
                {/* Status controls */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-muted/50 p-3 rounded-md">
                  <div>
                    <p className="text-sm font-medium mb-1">Current Status:</p>
                    {renderStatusBadge(selectedFeedback.status)}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Select 
                      defaultValue={selectedFeedback.status}
                      onValueChange={(value) => updateFeedbackStatus(selectedFeedback.id, value as FeedbackStatus)}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Admin response */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">Admin Response</label>
                      {(selectedFeedback.user_email || (selectedFeedback.user_details && selectedFeedback.user_details.email)) && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="send-email"
                            checked={sendResponseEmail}
                            onCheckedChange={(checked) => setSendResponseEmail(checked as boolean)}
                          />
                          <label
                            htmlFor="send-email"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Email response to user
                          </label>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {(selectedFeedback.user_email || (selectedFeedback.user_details && selectedFeedback.user_details.email)) 
                        ? "This response will be sent to the user via email"
                        : "No user email available - response will only be saved in the admin dashboard"}
                    </p>
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Enter your response to the feedback..."
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Internal Notes</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      These notes are only visible to administrators
                    </p>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this feedback..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitResponse} disabled={isSubmitting}>
                  {isSubmitting ? 
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {sendResponseEmail ? "Sending..." : "Saving..."}
                    </> : 
                    (sendResponseEmail && (selectedFeedback.user_email || selectedFeedback.user_details?.email)
                      ? "Send Response" 
                      : "Save Response")
                  }
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Email Alert Dialog */}
      <AlertDialog open={showEmailAlert} onOpenChange={setShowEmailAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Email Address Available</AlertDialogTitle>
            <AlertDialogDescription>
              This user didn't provide an email address. Your response will be saved in the system but cannot be sent to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}