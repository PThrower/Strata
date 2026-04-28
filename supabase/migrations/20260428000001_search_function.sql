-- Full-text search RPC over title || ' ' || body, with optional ecosystem and
-- category filters. Tier-aware: free callers receive only is_pro_only=false rows
-- and only rows from ecosystems where available_on_free=true.
CREATE OR REPLACE FUNCTION public.search_content_items(
  search_query     text,
  filter_ecosystem text DEFAULT NULL,
  filter_category  text DEFAULT NULL,
  user_tier        text DEFAULT 'free'
)
RETURNS TABLE (
  id             uuid,
  title          text,
  body           text,
  category       text,
  ecosystem_slug text,
  source_url     text,
  rank           real
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ci.id,
    ci.title,
    ci.body,
    ci.category,
    ci.ecosystem_slug,
    ci.source_url,
    ts_rank(
      to_tsvector('english', ci.title || ' ' || ci.body),
      plainto_tsquery('english', search_query)
    ) AS rank
  FROM public.content_items ci
  JOIN public.ecosystems e ON e.slug = ci.ecosystem_slug
  WHERE to_tsvector('english', ci.title || ' ' || ci.body)
        @@ plainto_tsquery('english', search_query)
    AND (filter_ecosystem IS NULL OR ci.ecosystem_slug = filter_ecosystem)
    AND (filter_category  IS NULL OR ci.category       = filter_category)
    AND (user_tier = 'pro' OR ci.is_pro_only      = false)
    AND (user_tier = 'pro' OR e.available_on_free = true)
  ORDER BY rank DESC
  LIMIT 50;
$$;
