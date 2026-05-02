-- Add injection safety and provenance columns to content_items.
-- injection_risk_score: Layer 1+2 scan result (0–10, NULL = pre-safety-system items)
-- is_quarantined: true means hidden from all queries via RLS + RPC filter
-- last_verified_at: when this item was last validated (for freshness envelope)
-- confidence: validator confidence level (mirrors ValidatedItem.confidence)
-- source_count: number of independent sources that confirmed this item

ALTER TABLE public.content_items
  ADD COLUMN injection_risk_score smallint,
  ADD COLUMN is_quarantined boolean NOT NULL DEFAULT false,
  ADD COLUMN last_verified_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN confidence text CHECK (confidence IN ('high', 'medium', 'low')),
  ADD COLUMN source_count integer NOT NULL DEFAULT 1;

CREATE INDEX idx_content_items_quarantine
  ON public.content_items(is_quarantined)
  WHERE is_quarantined = true;

-- Quarantine filter via RLS: authenticated and anon callers cannot see quarantined rows.
-- Service role bypasses RLS, so admin review endpoints still see quarantined items.
DROP POLICY IF EXISTS content_items_public_read ON public.content_items;
CREATE POLICY content_items_public_read
  ON public.content_items FOR SELECT
  USING (NOT is_quarantined);

-- Update search_content_items RPC to explicitly filter quarantined rows.
-- The service-role client used by API routes bypasses RLS, so we add the filter
-- directly in the RPC body to ensure safety regardless of calling role.
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
    AND NOT ci.is_quarantined
    AND (filter_ecosystem IS NULL OR ci.ecosystem_slug = filter_ecosystem)
    AND (filter_category  IS NULL OR ci.category       = filter_category)
    AND (user_tier = 'pro' OR ci.is_pro_only      = false)
    AND (user_tier = 'pro' OR e.available_on_free = true)
  ORDER BY rank DESC
  LIMIT 50;
$$;
