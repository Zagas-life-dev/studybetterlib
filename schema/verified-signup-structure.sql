-- This script sets up the profiles table and permissions to work with Supabase Auth's verification system
-- Run this to ensure proper integration between Auth and profiles

-- Begin transaction
BEGIN;

-- Drop and recreate the profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add optional email format validation
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies appropriate for verified sign-ups
-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Users can insert their own profile (needed for verified sign-ups)
CREATE POLICY "Users can insert own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Service role can perform any action (needed for server-side operations)
CREATE POLICY "Service role has full access" 
  ON public.profiles 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Special policy for admin access
CREATE POLICY "Admin email always has admin rights"
  ON public.profiles
  FOR ALL
  USING (auth.email() = 'studybetter.ai@gmail.com');

-- Create function to verify if a user is an admin without recursion
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _is_admin BOOLEAN;
  _email TEXT;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Special case for main admin account
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email = 'studybetter.ai@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- Direct query to avoid policy recursion
  SELECT is_admin INTO _is_admin 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can view and update all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (auth.is_admin());

-- Ensure the admin user profile exists
CREATE OR REPLACE FUNCTION ensure_admin_user()
RETURNS VOID AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Check if we have an auth user with the admin email
  SELECT id INTO admin_id FROM auth.users WHERE email = 'studybetter.ai@gmail.com';
  
  IF admin_id IS NOT NULL THEN
    -- Make sure we have a profile for this user
    INSERT INTO public.profiles (id, email, full_name, is_admin)
    VALUES (
      admin_id, 
      'studybetter.ai@gmail.com', 
      'Admin User',
      TRUE
    )
    ON CONFLICT (id) DO UPDATE 
    SET is_admin = TRUE, email = 'studybetter.ai@gmail.com', full_name = 'Admin User';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Call the function to ensure admin exists
SELECT ensure_admin_user();

-- We intentionally DO NOT create an automatic trigger for profile creation,
-- as we're handling this through verified sign-ups and the auth callback route

COMMIT;