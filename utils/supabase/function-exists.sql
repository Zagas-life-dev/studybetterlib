-- Function to check if another function exists in the database
CREATE OR REPLACE FUNCTION function_exists(function_name text) 
RETURNS TABLE(function_exists boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = function_name
  );
END;
$$ LANGUAGE plpgsql;