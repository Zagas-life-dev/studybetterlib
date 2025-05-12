-- Function to get table information
CREATE OR REPLACE FUNCTION public.get_table_info()
RETURNS TABLE (
  table_name text,
  column_count bigint,
  row_count bigint
) SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text AS table_name,
    COUNT(a.attname)::bigint AS column_count,
    (SELECT reltuples::bigint FROM pg_class WHERE oid = c.oid) AS row_count
  FROM
    pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_attribute a ON a.attrelid = c.oid
  WHERE
    n.nspname = 'public'
    AND c.relkind = 'r'
    AND a.attnum > 0
    AND NOT a.attisdropped
  GROUP BY
    c.relname, c.oid;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_table_info() TO authenticated;
