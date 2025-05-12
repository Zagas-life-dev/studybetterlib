-- Create the Study AI tables for chats and messages
CREATE TABLE IF NOT EXISTS study_ai_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for chat table
ALTER TABLE study_ai_chats ENABLE ROW LEVEL SECURITY;

-- Create policy for chat access
CREATE POLICY "Users can only access their own chats" 
  ON study_ai_chats
  FOR ALL
  USING (auth.uid() = user_id);

-- Create message table for storing chat messages
CREATE TABLE IF NOT EXISTS study_ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES study_ai_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for messages table
ALTER TABLE study_ai_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for message access
CREATE POLICY "Users can only access messages from their own chats"
  ON study_ai_messages
  FOR ALL
  USING (chat_id IN (
    SELECT id FROM study_ai_chats WHERE user_id = auth.uid()
  ));

-- Create function to update updated_at timestamp on chats when new messages are added
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE study_ai_chats
  SET updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update chat timestamp
CREATE TRIGGER update_chat_updated_at
AFTER INSERT ON study_ai_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_timestamp();