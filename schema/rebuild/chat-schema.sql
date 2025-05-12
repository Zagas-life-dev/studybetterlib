-- New chat schema with optimized structure
-- Created: May 2025
-- Description: Improved chat database structure with better role-based messages,
--              support for message metadata, and better organization features

-- Create new tables with optimized structure
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role-based messages with metadata support
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  tokens INTEGER,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create necessary indexes for better performance
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_updated_at_idx ON chat_sessions(updated_at);
CREATE INDEX IF NOT EXISTS chat_sessions_pinned_idx ON chat_sessions(pinned);
CREATE INDEX IF NOT EXISTS chat_sessions_course_id_idx ON chat_sessions(course_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS chat_messages_role_idx ON chat_messages(role);

-- Enable row level security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_sessions
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can insert their own chat sessions"
  ON chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can delete their own chat sessions"
  ON chat_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages in their own chat sessions" ON chat_messages;
CREATE POLICY "Users can view messages in their own chat sessions"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their own chat sessions" ON chat_messages;
CREATE POLICY "Users can insert messages in their own chat sessions"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update messages in their own chat sessions" ON chat_messages;
CREATE POLICY "Users can update messages in their own chat sessions"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete messages in their own chat sessions" ON chat_messages;
CREATE POLICY "Users can delete messages in their own chat sessions"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Create migration function for old data to new format
CREATE OR REPLACE FUNCTION migrate_chat_data() RETURNS VOID AS $$
DECLARE
  session_rec RECORD;
  message_rec RECORD;
  new_session_id UUID;
BEGIN
  -- Migrate sessions first
  FOR session_rec IN 
    SELECT * FROM ai_chat_sessions
  LOOP
    -- Insert into new chat_sessions table and get the new ID
    INSERT INTO chat_sessions 
      (id, user_id, title, course_id, created_at, updated_at)
    VALUES 
      (session_rec.id, session_rec.user_id, session_rec.title, session_rec.course_id, 
       session_rec.created_at, session_rec.updated_at)
    RETURNING id INTO new_session_id;
    
    -- Migrate messages for this session
    FOR message_rec IN 
      SELECT * FROM ai_chat_messages 
      WHERE session_id = session_rec.id
      ORDER BY created_at ASC
    LOOP
      -- Insert into new chat_messages table with role conversion
      INSERT INTO chat_messages
        (session_id, role, content, created_at, updated_at)
      VALUES
        (new_session_id, 
         CASE WHEN message_rec.is_user THEN 'user' ELSE 'assistant' END,
         message_rec.content, 
         message_rec.created_at, 
         message_rec.updated_at);
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to add system messages to existing chat sessions
CREATE OR REPLACE FUNCTION add_system_messages() RETURNS VOID AS $$
DECLARE
  session_rec RECORD;
  has_system_message BOOLEAN;
  system_content TEXT;
BEGIN
  FOR session_rec IN
    SELECT cs.*, c.title as course_title 
    FROM chat_sessions cs
    LEFT JOIN courses c ON cs.course_id = c.id
  LOOP
    -- Check if this session already has a system message
    SELECT EXISTS(
      SELECT 1 FROM chat_messages 
      WHERE session_id = session_rec.id AND role = 'system'
    ) INTO has_system_message;
    
    -- If no system message, add one
    IF NOT has_system_message THEN
      -- Create system message content
      system_content := 'You are an AI learning assistant for the Study Better platform. '
                      || 'Your goal is to help students understand course concepts, answer their questions, '
                      || 'and provide guidance on their studies.';
                      
      -- Add course context if available
      IF session_rec.course_title IS NOT NULL THEN
        system_content := system_content || ' This conversation is about the course: ' || session_rec.course_title || '.';
      END IF;
      
      system_content := system_content || ' Keep your responses concise, informative, and focused on helping the student learn.';
      
      -- Insert the system message
      INSERT INTO chat_messages 
        (session_id, role, content, created_at, updated_at)
      VALUES
        (session_rec.id, 'system', system_content, 
         session_rec.created_at - INTERVAL '1 second', -- Place just before first message
         session_rec.created_at - INTERVAL '1 second');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create a chat session with system message in one operation
CREATE OR REPLACE FUNCTION create_chat_session_with_system_message(
  p_user_id UUID,
  p_title TEXT,
  p_course_id UUID DEFAULT NULL
) 
RETURNS UUID AS $$
DECLARE
  new_session_id UUID;
  system_content TEXT;
  course_title TEXT;
BEGIN
  -- Create the chat session
  INSERT INTO chat_sessions 
    (user_id, title, course_id)
  VALUES 
    (p_user_id, p_title, p_course_id)
  RETURNING id INTO new_session_id;
  
  -- Get course title if available
  IF p_course_id IS NOT NULL THEN
    SELECT title INTO course_title 
    FROM courses 
    WHERE id = p_course_id;
  END IF;
  
  -- Create system message content
  system_content := 'You are an AI learning assistant for the Study Better platform. '
                 || 'Your goal is to help students understand course concepts, answer their questions, '
                 || 'and provide guidance on their studies.';
                 
  -- Add course context if available
  IF course_title IS NOT NULL THEN
    system_content := system_content || ' This conversation is about the course: ' || course_title || '.';
  END IF;
  
  system_content := system_content || ' Keep your responses concise, informative, and focused on helping the student learn.';
  
  -- Add the system message
  INSERT INTO chat_messages 
    (session_id, role, content)
  VALUES
    (new_session_id, 'system', system_content);
    
  -- Return the new session ID
  RETURN new_session_id;
END;
$$ LANGUAGE plpgsql;