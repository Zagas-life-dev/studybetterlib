-- This script drops and rebuilds the profiles table with proper structure and permissions
-- Warning: This will delete all existing profile data. Make sure to back up any important data first.

-- Begin transaction
BEGIN;

-- Drop existing profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create new profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add email constraint
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

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER create_profile_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_new_user();

-- Set up RLS policies for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Default policy: Users can view and update their own profile data
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Admin policies: Admins can view all profiles and manage admin status
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR 
    auth.email() = 'studybetter.ai@gmail.com'
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR 
    auth.email() = 'studybetter.ai@gmail.com'
  );

-- Special policy for the main admin account
CREATE POLICY "Admin email always has admin rights"
  ON public.profiles
  FOR ALL
  USING (auth.email() = 'studybetter.ai@gmail.com');

-- Create special function to ensure the main admin user always exists
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

-- Ensure admin user exists and is properly configured
SELECT ensure_admin_user();

-- Recreate any foreign key references to the profiles table
-- Assuming there are tables like orders that reference profiles
-- Example:
-- ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Commit transaction
COMMIT;