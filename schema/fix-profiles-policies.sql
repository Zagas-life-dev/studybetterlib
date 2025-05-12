-- This script fixes the infinite recursion in the profiles table policies
-- Run this after rebuilding the profiles table

-- Begin transaction
BEGIN;

-- First drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create a secure function to check admin status without recursion
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

  -- Use direct query to avoid policy recursion
  SELECT is_admin INTO _is_admin 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the policies using the non-recursive function
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (auth.is_admin());

-- Commit transaction
COMMIT;