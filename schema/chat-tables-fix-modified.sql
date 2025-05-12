-- Create courses table if it doesn't exist (simplified version)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  code TEXT,
  faculty TEXT,
  price NUMERIC DEFAULT 0,
  description TEXT,
  formats TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now create the chat tables
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_user BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS policies for ai_chat_sessions
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.ai_chat_sessions;

-- Create new policies
CREATE POLICY "Users can view their own chat sessions"
  ON public.ai_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
  ON public.ai_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON public.ai_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON public.ai_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Set up RLS policies for ai_chat_messages
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages from their chat sessions" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to their chat sessions" ON public.ai_chat_messages;

-- Create new policies
CREATE POLICY "Users can view messages from their chat sessions"
  ON public.ai_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_chat_sessions
    WHERE id = ai_chat_messages.session_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages to their chat sessions"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_chat_sessions
    WHERE id = ai_chat_messages.session_id
    AND user_id = auth.uid()
  ));

-- Set up RLS policies for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;

-- Create new policies
CREATE POLICY "Everyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );
