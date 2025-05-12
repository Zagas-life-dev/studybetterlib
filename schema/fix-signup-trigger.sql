-- Fix the signup error by removing the conflicting trigger
-- This allows signup to work properly with the verified email approach

-- Begin transaction
BEGIN;

-- Drop the trigger that's causing the conflict
DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;

-- Drop the function that was used by the trigger
DROP FUNCTION IF EXISTS create_profile_for_new_user();

-- Make sure the proper RLS policies are in place
-- Users need to be able to insert their own profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Service role needs full access for server operations
DROP POLICY IF EXISTS "Service role has full access" ON public.profiles;
CREATE POLICY "Service role has full access" 
  ON public.profiles 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Commit transaction
COMMIT;