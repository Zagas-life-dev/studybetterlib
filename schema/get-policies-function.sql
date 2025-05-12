-- Function to get policies (requires superuser privileges)
CREATE OR REPLACE FUNCTION public.get_policies()
RETURNS TABLE (
  table_name text,
  policy_name text,
  roles text[],
  cmd text,
  qual text,
  with_check text
) SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.relname::text AS table_name,
    p.polname::text AS policy_name,
    p.polroles::text[] AS roles,
    p.polcmd::text AS cmd,
    pg_get_expr(p.polqual, p.polrelid)::text AS qual,
    pg_get_expr(p.polwithcheck, p.polrelid)::text AS with_check
  FROM
    pg_policy p
    JOIN pg_class pc ON p.polrelid = pc.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
  WHERE
    pn.nspname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_policies() TO authenticated;
