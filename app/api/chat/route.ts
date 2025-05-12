import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { checkChatDBCompatibility } from "@/app/actions/chat-new"

// Chat history limit to avoid timeout/payload size issues
const MAX_CHAT_HISTORY = 15

// Helper function to safely stringify error objects for logging
function safeStringifyError(error: any): string {
  if (!error) return "Unknown error";
  
  try {
    if (typeof error === 'object') {
      return JSON.stringify({
        message: error.message || "No message",
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }
    return String(error);
  } catch (e) {
    return "Error cannot be stringified: " + String(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json()

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "Missing sessionId or message" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check which database schema to use
    const { compatible } = await checkChatDBCompatibility()
    
    // Step 1: Verify the chat session belongs to the user
    let chatSession;
    if (compatible) {
      // Use new schema
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id, title, course_id, courses(title)")
        .eq("id", sessionId)
        .eq("user_id", session.user.id)
        .single()
        
      if (error || !data) {
        console.error(`Session verification error: ${safeStringifyError(error)}`)
        return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
      }
      
      chatSession = data
    } else {
      // Use old schema
      const { data, error } = await supabase
        .from("ai_chat_sessions")
        .select("id, title, course_id, courses(title)")
        .eq("id", sessionId)
        .eq("user_id", session.user.id)
        .single()
        
      if (error || !data) {
        console.error(`Session verification error: ${safeStringifyError(error)}`)
        return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
      }
      
      chatSession = data
    }
    
    // Step 2: Store the user message
    if (compatible) {
      const { error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          role: "user", 
          content: message
        })
        
      if (messageError) {
        console.error(`Error storing user message: ${safeStringifyError(messageError)}`)
        return NextResponse.json({ error: "Failed to store message" }, { status: 500 })
      }
    } else {
      const { error: messageError } = await supabase
        .from("ai_chat_messages")
        .insert({
          session_id: sessionId,
          is_user: true,
          content: message
        })
        
      if (messageError) {
        console.error(`Error storing user message: ${safeStringifyError(messageError)}`)
        return NextResponse.json({ error: "Failed to store message" }, { status: 500 })
      }
    }
    
    // Step 3: Construct AI messages history
    let chatHistory = []
    if (compatible) {
      const { data: historyData, error: historyError } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(MAX_CHAT_HISTORY)
        
      if (historyError) {
        console.error(`Error getting chat history: ${safeStringifyError(historyError)}`)
        return NextResponse.json({ error: "Failed to retrieve chat history" }, { status: 500 })
      }
      
      chatHistory = historyData || []
    } else {
      const { data: historyData, error: historyError } = await supabase
        .from("ai_chat_messages")
        .select("is_user, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(MAX_CHAT_HISTORY)
        
      if (historyError) {
        console.error(`Error getting chat history: ${safeStringifyError(historyError)}`)
        return NextResponse.json({ error: "Failed to retrieve chat history" }, { status: 500 })
      }
      
      // Convert old schema to new format
      chatHistory = (historyData || []).map(msg => ({
        role: msg.is_user ? "user" : "assistant",
        content: msg.content,
        created_at: msg.created_at
      }))
    }
    
    // Step 4: Check if this is the first message
    const userMessages = chatHistory.filter(msg => msg.role === "user")
    const isFirstUserMessage = userMessages.length === 1
        
    // Step 5: Call Mistral AI API
    if (!process.env.MISTRAL_API_KEY) {
      console.error("Mistral API key not configured")
      return NextResponse.json({ error: "AI API key is not configured" }, { status: 500 })
    }

    // Create system message with course context if available
    const systemMessage = {
      role: "system" as const,
      content: `You are an AI learning assistant called Study AI. Answer questions clearly and concisely.${
        chatSession.course_id && chatSession.courses?.title 
          ? ` This conversation is about the course: ${chatSession.courses.title}.` 
          : ""
      }`
    }
    
    // Format messages for API request
    const formattedMessages = [
      systemMessage,
      ...chatHistory.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      }))
    ]
    
    let aiResponse
    try {
      const response = await fetch("https://api.mistral.ai/v1/agents/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          agent_id: process.env.MISTRAL_AGENT_ID || "default",
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: false,
          parallel_tool_calls: true
        }),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Could not read error response")
        console.error(`Agent API error: ${response.status}`, errorText)
        throw new Error(`Agent API returned status ${response.status}`)
      }

      aiResponse = await response.json()
    } catch (error: any) {
      console.error("Error calling Mistral Agent API:", error)
      
      // Store error response in the database
      const errorMessage = "I'm sorry, I encountered an error while processing your request. Please try again."
      
      if (compatible) {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: errorMessage,
          metadata: { error: true, errorType: "api" }
        })
      } else {
        await supabase.from("ai_chat_messages").insert({
          session_id: sessionId,
          is_user: false,
          content: errorMessage
        })
      }
      
      return NextResponse.json({ 
        message: errorMessage, 
        error: error.message || "API connection error"
      })
    }
    
    // Extract AI's response
    const aiMessage = aiResponse.choices[0].message.content

    // Step 6: Store the AI response
    if (compatible) {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: aiMessage,
        tokens: aiResponse.usage?.completion_tokens || null,
        metadata: { 
          prompt_tokens: aiResponse.usage?.prompt_tokens,
          completion_tokens: aiResponse.usage?.completion_tokens,
          total_tokens: aiResponse.usage?.total_tokens
        }
      })
    } else {
      await supabase.from("ai_chat_messages").insert({
        session_id: sessionId,
        is_user: false,
        content: aiMessage
      })
    }
    
    // Step 7: If this is the first message, generate a title for the chat
    if (isFirstUserMessage) {
      try {
        const titlePrompt = `Create a 3-5 word title for this chat. No quotes or explanations, just the title:\nUser: ${message}\nAssistant: ${aiMessage.substring(0, 150)}...`
        
        const titleResponse = await fetch("https://api.mistral.ai/v1/agents/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
          },
          body: JSON.stringify({
            agent_id: process.env.MISTRAL_AGENT_ID || "default",
            messages: [
              { role: "system", content: "You are a title generator." },
              { role: "user", content: titlePrompt }
            ],
            temperature: 0.3,
            max_tokens: 20
          })
        })
        
        if (titleResponse.ok) {
          const titleResult = await titleResponse.json()
          let title = titleResult.choices[0].message.content.trim()
          
          // Remove quotes and periods
          title = title.replace(/^["']|["']$|\.$/g, "").trim()
          
          // Update the chat session title
          if (compatible) {
            await supabase
              .from("chat_sessions")
              .update({ 
                title, 
                updated_at: new Date().toISOString() 
              })
              .eq("id", sessionId)
          } else {
            await supabase
              .from("ai_chat_sessions")
              .update({ 
                title, 
                updated_at: new Date().toISOString() 
              })
              .eq("id", sessionId)
          }
        }
      } catch (titleError) {
        // Just log the error, don't fail the whole request
        console.error("Error generating title:", titleError)
      }
    }
    
    // Step 8: Update the session's updated_at timestamp
    if (compatible) {
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId)
    } else {
      await supabase
        .from("ai_chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId)
    }
    
    // Return the AI response
    return NextResponse.json({
      message: aiMessage,
      usage: aiResponse.usage
    })
    
  } catch (error) {
    console.error("Error processing chat request:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
