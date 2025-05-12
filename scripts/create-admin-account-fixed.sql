-- First check if the user already exists
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO user_id FROM auth.users WHERE email = 'studybetter.ai@gmail.com';
  
  -- If user doesn't exist, create it
  IF user_id IS NULL THEN
    -- Insert the user
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
    RETURNING id INTO user_id;
    
    RAISE NOTICE 'Created new admin user with ID: %', user_id;
  ELSE
    RAISE NOTICE 'Admin user already exists with ID: %', user_id;
  END IF;
  
  -- Update or insert the profile
  UPDATE public.profiles
  SET is_admin = true
  WHERE id = user_id;
  
  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, is_admin, created_at, updated_at)
    VALUES (
      user_id, 
      'studybetter.ai@gmail.com', 
      'Admin User', 
      true, 
      now(), 
      now()
    );
    RAISE NOTICE 'Created new admin profile';
  ELSE
    RAISE NOTICE 'Updated existing profile to admin';
  END IF;
END $$;
