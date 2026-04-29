-- Atomic delete-and-insert for the best-practices set of an ecosystem.
--
-- The previous TS implementation in scripts/refresh/writer.ts ran a DELETE
-- followed by an INSERT as separate round-trips. If the INSERT failed (or
-- the process died between the two calls), the ecosystem was left with zero
-- best practices until the next refresh. Wrapping both in a single function
-- runs them inside the same transaction — either everything commits, or
-- nothing changes.
--
-- items_json is a JSON array of objects shaped like:
--   { title, body, published_at }
CREATE OR REPLACE FUNCTION public.replace_best_practices(
  ecosystem  text,
  items_json jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
BEGIN
  DELETE FROM public.content_items
   WHERE ecosystem_slug = ecosystem
     AND category = 'best_practices';

  IF jsonb_array_length(items_json) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.content_items
    (ecosystem_slug, category, title, body, source_url, published_at, is_pro_only)
  SELECT
    ecosystem,
    'best_practices',
    item->>'title',
    item->>'body',
    NULL,
    COALESCE((item->>'published_at')::timestamptz, now()),
    false
  FROM jsonb_array_elements(items_json) AS item;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_best_practices(text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_best_practices(text, jsonb) TO service_role;
