-- Step 1: Create the user in auth.users table
-- Note: This requires supabase_admin privileges
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  uuid_generate_v4(),
  'studybetter.ai@gmail.com',
  crypt('studyAIlogin@admin.1709', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Admin User"}'
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Step 2: Set the admin flag in the profiles table
-- This will be triggered by the handle_new_user function if it exists
-- But we'll also do it explicitly to ensure it's set
UPDATE public.profiles
SET is_admin = true
WHERE email = 'studybetter.ai@gmail.com';

-- If the profile doesn't exist yet (in case the trigger didn't work), create it
INSERT INTO public.profiles (id, email, full_name, is_admin, created_at, updated_at)
SELECT 
  id, 
  'studybetter.ai@gmail.com', 
  'Admin User', 
  true, 
  now(), 
  now()
FROM auth.users
WHERE email = 'studybetter.ai@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'studybetter.ai@gmail.com'
);
