import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Get Mistral API credentials from environment variables
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_AGENT_ID = process.env.MISTRAL_AGENT_ID;
const MAX_MESSAGES_HISTORY = 10; // Limit history to prevent request timeouts

if (!MISTRAL_API_KEY || !MISTRAL_AGENT_ID) {
  throw new Error('Mistral API credentials not properly configured. Please check your .env file.');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get user session to verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { chatId, message } = body;
    
    if (!chatId || !message) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Verify that the chat belongs to the user
    const { data: chatData, error: chatError } = await supabase
      .from('study_ai_chats')
      .select('user_id')
      .eq('id', chatId)
      .single();
    
    if (chatError || chatData?.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to access this chat' }, { status: 403 });
    }
    
    // Fetch previous messages from this chat - LIMIT to prevent timeout issues
    const { data: messagesData, error: messagesError } = await supabase
      .from('study_ai_messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(MAX_MESSAGES_HISTORY); // Limit the number of messages retrieved
    
    if (messagesError) {
      return NextResponse.json({ error: 'Failed to retrieve chat history' }, { status: 500 });
    }
    
    const chatHistory = messagesData || [];
    
    // Save user message to database
    const { error: insertError } = await supabase
      .from('study_ai_messages')
      .insert({
        chat_id: chatId,
        role: 'user',
        content: message
      });
    
    if (insertError) {
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
    
    // Prepare messages for Mistral API
    const messages = [
      ...chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];
    
    try {
      // Call Mistral Agent API with robust error handling
      console.log('Calling Mistral API with messages:', JSON.stringify(messages));
      const response = await fetch(`https://api.mistral.ai/v1/agents/${MISTRAL_AGENT_ID}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          messages
        }),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        console.error('Mistral API error:', errorData);
        throw new Error(`Failed to get response from AI: ${errorData.message || 'Unknown error'}`);
      }
      
      const aiResponse = await response.json();
      console.log('Received response from Mistral API:', JSON.stringify(aiResponse));
      
      // Extract content from response - handle different possible response formats
      let assistantContent = "";
      
      if (aiResponse.choices && aiResponse.choices.length > 0) {
        if (aiResponse.choices[0].message && aiResponse.choices[0].message.content) {
          assistantContent = aiResponse.choices[0].message.content;
        } else if (aiResponse.choices[0].content) {
          assistantContent = aiResponse.choices[0].content;
        } else if (aiResponse.response) {
          assistantContent = aiResponse.response;
        } else {
          console.error('Unexpected API response structure:', aiResponse);
          assistantContent = "I'm sorry, I couldn't process your request properly.";
        }
      } else if (aiResponse.message && aiResponse.message.content) {
        assistantContent = aiResponse.message.content;
      } else if (aiResponse.content) {
        assistantContent = aiResponse.content;
      } else if (aiResponse.response) {
        assistantContent = aiResponse.response;
      } else {
        console.error('Unexpected API response structure:', aiResponse);
        assistantContent = "I'm sorry, I couldn't process your request properly.";
      }
      
      // Save AI response to database
      const { error: aiInsertError } = await supabase
        .from('study_ai_messages')
        .insert({
          chat_id: chatId,
          role: 'assistant',
          content: assistantContent
        });
      
      if (aiInsertError) {
        console.error('Error saving AI response:', aiInsertError);
        return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
      }
      
      // Update chat title if this is the first message
      if (chatHistory.length === 0) {
        const { error: titleError } = await supabase
          .from('study_ai_chats')
          .update({ title: message.slice(0, 50) + (message.length > 50 ? '...' : '') })
          .eq('id', chatId);
          
        if (titleError) {
          console.error('Error updating chat title:', titleError);
        }
      }
      
      return NextResponse.json({ success: true });
      
    } catch (apiError) {
      console.error('Error calling Mistral API:', apiError);
      
      // Save a fallback message in case of API failure
      await supabase
        .from('study_ai_messages')
        .insert({
          chat_id: chatId,
          role: 'assistant',
          content: "I'm sorry, I'm having trouble processing your request right now. Please try again later."
        });
        
      return NextResponse.json({ 
        error: apiError instanceof Error ? apiError.message : 'Failed to communicate with AI service' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in Study AI chat API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}