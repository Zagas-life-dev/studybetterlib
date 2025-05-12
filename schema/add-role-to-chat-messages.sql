-- Add the role column to the ai_chat_messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_chat_messages' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.ai_chat_messages 
        ADD COLUMN role TEXT;
        
        -- Update existing messages based on the is_user flag
        UPDATE public.ai_chat_messages 
        SET role = CASE 
            WHEN is_user = true THEN 'user' 
            ELSE 'assistant' 
        END;
        
        -- Make role NOT NULL after setting values
        ALTER TABLE public.ai_chat_messages 
        ALTER COLUMN role SET NOT NULL;
        
        -- Add a check constraint to enforce valid roles
        ALTER TABLE public.ai_chat_messages
        ADD CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'));
    END IF;
END $$;

-- Add updated_at column if it doesn't exist for consistency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_chat_messages' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.ai_chat_messages 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to avoid errors
DROP TRIGGER IF EXISTS update_ai_chat_messages_timestamp ON public.ai_chat_messages;

-- Create the trigger
CREATE TRIGGER update_ai_chat_messages_timestamp
BEFORE UPDATE ON public.ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();