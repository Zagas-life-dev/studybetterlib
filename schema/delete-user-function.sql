-- Function to allow users to delete their own account
-- This is designed to be callable from client-side code via RPC
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get the ID of the currently authenticated user
  user_id := auth.uid();
  
  -- Check if the user exists
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user data from related tables (only include tables that exist)
  -- First check if tables exist before attempting deletion
  
  -- Clean up from feedback system if it exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'feedback'
  ) THEN
    DELETE FROM public.feedback WHERE user_id = auth.uid();
  END IF;
  
  -- Clean up from chat sessions if they exist
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_chat_sessions'
  ) THEN
    DELETE FROM public.ai_chat_sessions WHERE user_id = auth.uid();
  END IF;
  
  -- Clean up from chat sessions if they exist (new schema)
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_sessions'
  ) THEN
    DELETE FROM public.chat_sessions WHERE user_id = auth.uid();
  END IF;
  
  -- Delete the user's profile last
  DELETE FROM profiles WHERE id = auth.uid();
  
  -- Request deletion of the user's auth account
  -- Note: This function alone cannot delete from auth.users directly
  -- It will mark the user for deletion
  INSERT INTO 
    auth.users_to_delete (id, delete_at)
  VALUES 
    (auth.uid(), now() + interval '1 second')
  ON CONFLICT (id) DO UPDATE
    SET delete_at = now() + interval '1 second';

  RETURN true;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;