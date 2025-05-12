-- Create Study AI chat tables for storing chat sessions and messages

-- Create the chat sessions table
CREATE TABLE IF NOT EXISTS public.study_ai_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS study_ai_chats_user_id_idx ON public.study_ai_chats(user_id);
CREATE INDEX IF NOT EXISTS study_ai_chats_updated_at_idx ON public.study_ai_chats(updated_at);

-- Enable row level security for chat sessions
ALTER TABLE public.study_ai_chats ENABLE ROW LEVEL SECURITY;

-- Create policy for chat access
CREATE POLICY "Users can only access their own chats" 
  ON public.study_ai_chats
  FOR ALL
  USING (auth.uid() = user_id);

-- Create message table for storing chat messages
CREATE TABLE IF NOT EXISTS public.study_ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.study_ai_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS study_ai_messages_chat_id_idx ON public.study_ai_messages(chat_id);
CREATE INDEX IF NOT EXISTS study_ai_messages_created_at_idx ON public.study_ai_messages(created_at);

-- Enable row level security for messages
ALTER TABLE public.study_ai_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for message access
CREATE POLICY "Users can only access messages from their own chats"
  ON public.study_ai_messages
  FOR ALL
  USING (chat_id IN (
    SELECT id FROM public.study_ai_chats WHERE user_id = auth.uid()
  ));

-- Create function to update updated_at timestamp on chats when new messages are added
CREATE OR REPLACE FUNCTION public.update_study_ai_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.study_ai_chats
  SET updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update chat timestamp
CREATE TRIGGER update_study_ai_chat_updated_at
AFTER INSERT ON public.study_ai_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_study_ai_chat_timestamp();