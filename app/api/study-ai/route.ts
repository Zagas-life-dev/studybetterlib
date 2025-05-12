import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = createClient();
    
    // Get session to verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { messages, chatId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Mistral API integration
    const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
    const MISTRAL_AGENT_ID = process.env.MISTRAL_AGENT_ID;
    
    if (!MISTRAL_API_KEY || !MISTRAL_AGENT_ID) {
      return NextResponse.json({ error: 'Mistral API configuration missing' }, { status: 500 });
    }

    // Store the chat if it doesn't exist yet
    if (!chatId) {
      const { data: chat, error: chatError } = await supabase
        .from('study_ai_chats')
        .insert([{ user_id: userId, title: messages[0].content.slice(0, 50) + '...' }])
        .select('id')
        .single();
        
      if (chatError) {
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
      }
      
      // Store the initial message
      const { error: messageError } = await supabase
        .from('study_ai_messages')
        .insert(messages.map(msg => ({
          chat_id: chat.id,
          role: msg.role,
          content: msg.content
        })));
        
      if (messageError) {
        return NextResponse.json({ error: 'Failed to store messages' }, { status: 500 });
      }
    } else {
      // Store only the latest user message
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role === 'user') {
        const { error: messageError } = await supabase
          .from('study_ai_messages')
          .insert({
            chat_id: chatId,
            role: latestMessage.role,
            content: latestMessage.content
          });
          
        if (messageError) {
          return NextResponse.json({ error: 'Failed to store message' }, { status: 500 });
        }
      }
    }

    // Call Mistral API
    const response = await fetch(`https://api.mistral.ai/v1/agents/${MISTRAL_AGENT_ID}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ 
        error: `Mistral API error: ${errorData.error?.message || response.statusText}` 
      }, { status: response.status });
    }

    const data = await response.json();
    const aiResponse = data.messages[data.messages.length - 1].content;

    // Store AI response in database
    const { error: responseError } = await supabase
      .from('study_ai_messages')
      .insert({
        chat_id: chatId || data.chat_id,
        role: 'assistant',
        content: aiResponse
      });
      
    if (responseError) {
      console.error('Error storing AI response:', responseError);
    }

    return NextResponse.json({ 
      response: aiResponse,
      chatId: chatId || data.chat_id
    });
  } catch (error) {
    console.error('Error in Study AI chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}