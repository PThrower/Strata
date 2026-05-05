-- search_content_items v2: weight ts_rank by confidence and source_count.
--
-- v1 ranked purely by ts_rank — BM25-style term frequency with no quality signal.
-- A low-confidence single-source item ranked identically to a high-confidence,
-- multiply-corroborated item if keyword frequency was the same.
--
-- v2 multiplies ts_rank by a quality blend derived from two existing columns:
--   confidence (high/medium/low, CHECK constraint) → 1.0 / 0.5 / 0.0
--   source_count (integer NOT NULL DEFAULT 1) → log-scaled, saturates at 3 sources
--
-- The multiplier ranges from 0.70 (low confidence, 1 source) to 1.00 (high
-- confidence, 3+ sources), so quality re-ranks items within a keyword match
-- without distorting recall. Documents that match must still match via FTS.
--
-- No schema changes. Same function signature and return type as v1.

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
    (
      ts_rank(
        to_tsvector('english', ci.title || ' ' || ci.body),
        plainto_tsquery('english', search_query)
      ) * (
        0.7
        + 0.15 * CASE ci.confidence
                   WHEN 'high'   THEN 1.0
                   WHEN 'medium' THEN 0.5
                   ELSE               0.0
                 END
        + 0.15 * LEAST(ci.source_count::float / 3.0, 1.0)
      )
    )::real AS rank
  FROM public.content_items ci
  JOIN public.ecosystems e ON e.slug = ci.ecosystem_slug
  WHERE to_tsvector('english', ci.title || ' ' || ci.body)
        @@ plainto_tsquery('english', search_query)
    AND NOT ci.is_quarantined
    AND (filter_ecosystem IS NULL OR ci.ecosystem_slug = filter_ecosystem)
    AND (filter_category  IS NULL OR ci.category       = filter_category)
    AND (user_tier = 'pro' OR ci.is_pro_only      = false)
    AND (user_tier = 'pro' OR e.available_on_free = true)
  ORDER BY rank DESC
  LIMIT 50;
$$;
